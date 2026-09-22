const test = require('node:test');
const assert = require('node:assert/strict');
const Customer = require('../models/Customer');
const controller = require('../controllers/customerController');
const response = () => ({statusCode:200,status(n){this.statusCode=n;return this},json(data){this.data=data}});
test('history retains repeated customer rows, counts activities and filters before pagination', async()=>{
  const original=Customer.aggregate;
  let pipeline;
  const rows=[{_id:'mustafa',eventId:'upload2'},{_id:'mustafa',eventId:'upload1'},{_id:'mujtaba',eventId:'created2'},{_id:'mustafa',eventId:'created1'}];
  Customer.aggregate=async p=>{pipeline=p;return [{customers:rows,count:[{total:34}]}]};
  try{
    const res=response();
    await controller.history({query:{page:'2',limit:'30',from:'2026-09-01',to:'2026-09-30',sort:'oldest'}},res);
    assert.deepEqual(res.data.customers,rows);
    assert.equal(res.data.total,34);assert.equal(res.data.pages,2);
    assert.ok(pipeline.some(stage=>stage.$unwind==='$events'));
    assert.equal(pipeline.some(stage=>stage.$group),false);
    assert.deepEqual(pipeline.find(stage=>stage.$sort).$sort,{'events.at':-1,'events.kind':-1,'events.eventId':-1,_id:-1});
    assert.equal(pipeline.find(stage=>stage.$facet).$facet.customers[0].$skip,30);
    assert.ok(pipeline.findIndex(stage=>stage.$match)<pipeline.findIndex(stage=>stage.$facet));
    assert.equal(pipeline.find(stage=>stage.$match).$match['events.at'].$lte.toISOString(),'2026-09-30T23:59:59.999Z');
    const sources=pipeline[0].$project.events.$concatArrays;
    assert.equal(sources[0][0].kind,'customer_created');
    assert.equal(sources[1].$map.in.kind,'document_uploaded');
    assert.equal(sources[1].$map.in.eventId,'$$doc._id');
  }finally{Customer.aggregate=original}
});
test('history rejects invalid/reversed dates and handles empty records',async()=>{
  const original=Customer.aggregate;let calls=0;
  Customer.aggregate=async()=>{calls++;return [{customers:[],count:[]}]};
  try{
    for(const query of [{from:'invalid'},{from:'2026-09-30',to:'2026-09-01'}]){
      const res=response();await controller.history({query},res);assert.equal(res.statusCode,400);
    }
    assert.equal(calls,0);
    const res=response();await controller.history({query:{}},res);
    assert.deepEqual(res.data,{customers:[],total:0,page:1,pages:0});
  }finally{Customer.aggregate=original}
});
