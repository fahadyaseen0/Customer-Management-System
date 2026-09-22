const test = require('node:test');
const assert = require('node:assert/strict');
const {sendCustomerImage} = require('../services/whatsapp');
const input = {imageUrl:'https://example.com/image.png',phone:'+92 300 1234567',customerName:'Ali'};
test('BotLinkd sends correct multipart image/PDF templates and handles failures',async()=>{
 const original=global.fetch;
 Object.assign(process.env,{BOTLINKD_APP_KEY:'private-app-key',BOTLINKD_AUTH_KEY:'private-auth-key',BOTLINKD_IMAGE_TEMPLATE:'customer_image',BOTLINKD_DOCUMENT_TEMPLATE:'customer_pdf',BOTLINKD_TEMPLATE_LANGUAGE:'en',BOTLINKD_BODY_PARAMS:'["{customerName}"]'});
 try {
  for(const pdf of [false,true]){
   global.fetch=async(url,opts)=>{
    assert.equal(url,'https://botlinkd.com/api/whatsapp/template');assert.equal(opts.method,'POST');
    assert.equal(opts.body.get('appkey'),'private-app-key');assert.equal(opts.body.get('authkey'),'private-auth-key');
    assert.equal(opts.body.get('to'),'923001234567');assert.equal(opts.body.get('template'),pdf?'customer_pdf':'customer_image');
    assert.equal(opts.body.get(pdf?'header_document_url':'header_image_url'),input.imageUrl);
    assert.equal(opts.body.get('body_params[0]'),'Ali');assert.equal(opts.headers,undefined);
    return {ok:true,status:200,json:async()=>({success:true,message_id:'msg-1'})};
   };
   const result=await sendCustomerImage({...input,resourceType:pdf?'raw':'image'});assert.equal(result.status,'sent');assert.equal(result.messageId,'msg-1');
  }
  global.fetch=async()=>({ok:true,status:200,json:async()=>({status:'error',message:'private-app-key private-auth-key unavailable'})});
  let result=await sendCustomerImage(input);assert.equal(result.status,'failed');assert.ok(!result.error.includes('private-'));
  global.fetch=async()=>({ok:false,status:401,json:async()=>({message:'Unauthorized'})});
  assert.equal((await sendCustomerImage(input)).status,'failed');
  global.fetch=async()=>({ok:true,status:200,json:async()=>{throw new Error('HTML')}});
  assert.match((await sendCustomerImage(input)).error,/unreadable/);
  global.fetch=async()=>{throw new Error('Timeout')};assert.match((await sendCustomerImage(input)).error,/Check WhatsApp before retrying/);
  delete process.env.BOTLINKD_APP_KEY;assert.equal((await sendCustomerImage(input)).status,'not_configured');
 }finally{global.fetch=original}
});
test('admin and user login are strictly separated',async()=>{
 const User=require('../models/User'),bcrypt=require('bcrypt'),{login}=require('../controllers/authController');
 const original=User.findOne;const hash=await bcrypt.hash('password123',4);process.env.JWT_SECRET='test-only-secret';
 const response=()=>({code:200,status(n){this.code=n;return this},json(d){this.data=d}});
 try{
  for(const role of ['admin','user'])for(const adminMode of [true,false]){
   let saves=0;User.findOne=()=>({select:async()=>({_id:'id',name:'Test',role,active:true,passwordHash:hash,save:async()=>{saves++}})});
   const res=response();await login({body:{email:'test@gmail.com',password:'password123',adminMode}},res);
   const allowed=adminMode===(role==='admin');assert.equal(res.code,allowed?200:403);assert.equal(saves,allowed?1:0);assert.equal(Boolean(res.data.token),allowed);
  }
  const res=response();await login({body:{adminMode:'false'}},res);assert.equal(res.code,400);
 }finally{User.findOne=original}
});
test('admin status cannot be changed even using API directly',async()=>{
 const User=require('../models/User'),{setUserStatus}=require('../controllers/userController');const original=User.findById;
 User.findById=async()=>({role:'admin',save:async()=>assert.fail('must not save')});
 try{const res={status(n){this.code=n;return this},json(){}};await setUserStatus({body:{active:false},user:{_id:'other-admin'},params:{id:'admin'}},res);assert.equal(res.code,403)}finally{User.findById=original}
});
test('Staff DELETE endpoint is admin-only, validates ID and preserves customers',async()=>{
 process.env.JWT_SECRET='test-only-secret';
 const app=require('../server'),User=require('../models/User'),Staff=require('../models/Staff'),jwt=require('jsonwebtoken');
 const original={user:User.findById,remove:Staff.findByIdAndDelete};let role='user',deleted=0;
 User.findById=async()=>({_id:'actor',role,active:true,tokenVersion:0});
 Staff.findByIdAndDelete=async()=>{deleted++;return deleted===1?{name:'Staff'}:null};
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/api/staff/';
 const opts={method:'DELETE',headers:{Authorization:'Bearer '+jwt.sign({sub:'actor',tokenVersion:0},process.env.JWT_SECRET)}};
 try{
  assert.equal((await fetch(url+'507f1f77bcf86cd799439011',opts)).status,403);assert.equal(deleted,0);
  role='admin';assert.equal((await fetch(url+'invalid',opts)).status,400);assert.equal(deleted,0);
  assert.equal((await fetch(url+'507f1f77bcf86cd799439011',opts)).status,200);
  assert.equal((await fetch(url+'507f1f77bcf86cd799439011',opts)).status,404);
 }finally{User.findById=original.user;Staff.findByIdAndDelete=original.remove;await new Promise(resolve=>server.close(resolve))}
});
test('upload persists image before provider failure and keeps saved asset',async()=>{
 const Customer=require('../models/Customer'),Staff=require('../models/Staff'),cloudinary=require('../config/cloudinary'),c=require('../controllers/customerController'),mongoose=require('mongoose');
 const original={customer:Customer.findById,staff:Staff.findById,upload:cloudinary.uploader.upload,destroy:cloudinary.uploader.destroy,fetch:global.fetch};
 const id=new mongoose.Types.ObjectId(),customer=new Customer({name:'Ali',city:'Lahore',staff:id,savedBy:{user:id,name:'Actor'}});let saves=0;
 customer.save=async()=>{saves++;return customer};Customer.findById=async()=>customer;Staff.findById=async()=>({_id:id,name:'Staff',phone:'923001234567'});
 cloudinary.uploader.upload=async()=>({public_id:'asset',secure_url:'https://example.com/photo.png'});cloudinary.uploader.destroy=async()=>assert.fail('must retain saved asset');
 Object.assign(process.env,{BOTLINKD_APP_KEY:'app',BOTLINKD_AUTH_KEY:'auth',BOTLINKD_IMAGE_TEMPLATE:'image'});
 global.fetch=async()=>{assert.equal(saves,1);throw new Error('unavailable')};
 try{let data;await c.upload({params:{id},file:{mimetype:'image/png',buffer:Buffer.from('image')},user:{_id:id,name:'Actor'}},{json:d=>{data=d}});assert.equal(data.notification.status,'failed');assert.equal(customer.documents.length,1);assert.equal(customer.documents[0].publicId,'asset');assert.equal(saves,2)}
 finally{Customer.findById=original.customer;Staff.findById=original.staff;cloudinary.uploader.upload=original.upload;cloudinary.uploader.destroy=original.destroy;global.fetch=original.fetch}
});
