const test = require('node:test');
const assert = require('node:assert/strict');
const Customer = require('../models/Customer');
const Staff = require('../models/Staff');
const User = require('../models/User');
const c = require('../controllers/customerController');
const response = () => ({statusCode:200,status(n){this.statusCode=n;return this},json(data){this.data=data;return this}});
test('create requires registered Staff and captures assignment', async()=>{
 const original={staff:Staff.findById,create:Customer.create};
 const id='507f1f77bcf86cd799439011';
 Staff.findById=async()=>({_id:id,name:'Assigned'}); Customer.create=async data=>data;
 try{let res=response();await c.create({body:{name:'A',city:'B'},user:{}},res);assert.equal(res.statusCode,400);
 res=response();await c.create({body:{name:'A',city:'B',staffId:id},user:{_id:id,name:'Actor'}},res);assert.equal(res.data.customer.staff,id);assert.equal(res.data.customer.staffName,'Assigned');assert.ok(res.data.customer.lastActivityAt instanceof Date);
 }finally{Staff.findById=original.staff;Customer.create=original.create}
});
test('list forces descending activity even when oldest is requested',async()=>{
 const original={find:Customer.find,count:Customer.countDocuments};let order;
 const chain={select(){return this},sort(s){order=s;return this},skip(){return this},limit(){return []}};
 Customer.find=()=>chain;Customer.countDocuments=async()=>0;
 try{await c.list({query:{sort:'oldest'}},response());assert.deepEqual(order,{lastActivityAt:-1,_id:-1})}finally{Customer.find=original.find;Customer.countDocuments=original.count}
});
test('password reset hashes password and increments session version',async()=>{
 const {resetPassword}=require('../controllers/userController');const bcrypt=require('bcrypt');const old=User.findByIdAndUpdate;let update;
 User.findByIdAndUpdate=async(_id,data)=>{update=data;return {_id:'actor'}};
 try{let res=response();await resetPassword({body:{password:'short'},params:{id:'actor'}},res);assert.equal(res.statusCode,400);
 res=response();await resetPassword({body:{password:'new-password-123'},params:{id:'actor'}},res);assert.equal(res.statusCode,200);assert.equal(update.$inc.tokenVersion,1);assert.notEqual(update.$set.passwordHash,'new-password-123');assert.ok(await bcrypt.compare('new-password-123',update.$set.passwordHash));assert.equal(res.data.passwordHash,undefined);
 }finally{User.findByIdAndUpdate=old}
});
test('failed WhatsApp send keeps document and records failure for retry',async()=>{
 const old={find:Customer.findById,staff:Staff.findById,fetch:global.fetch};const doc={url:'https://example.com/a.png'};let saves=0;
 Customer.findById=async()=>({name:'A',staff:'assigned',documents:{id:()=>doc},save:async()=>{saves++}});
 Staff.findById=async()=>({phone:'923001234567'});process.env.BOTLINKD_APP_KEY='test';process.env.BOTLINKD_AUTH_KEY='admin';process.env.BOTLINKD_IMAGE_TEMPLATE="image_template";global.fetch=async()=>{throw new Error('Provider unavailable')};
 try{const res=response();await c.send({params:{id:'c',docId:'d'},user:{_id:'actor'}},res);assert.equal(res.data.notification.status,'failed');assert.equal(doc.lastSend.status,'failed');assert.equal(saves,1);assert.equal(doc.url,'https://example.com/a.png')}finally{Customer.findById=old.find;Staff.findById=old.staff;global.fetch=old.fetch}
});
