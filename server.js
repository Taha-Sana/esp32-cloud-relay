const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

let devices = {}; // deviceID -> {servo, wifi, cameraFrame, DHT}

app.post('/api/device/:id/command', (req,res)=>{
  const deviceID = req.params.id;
  if(!devices[deviceID]) devices[deviceID]={};
  devices[deviceID].servo = req.body.servo;
  devices[deviceID].wifi = req.body.wifi;
  devices[deviceID].DHT = req.body.DHT;
  res.json({status:'ok'});
});

app.get('/api/device/:id/command', (req,res)=>{
  const deviceID = req.params.id;
  if(!devices[deviceID]) devices[deviceID]={};
  res.json(devices[deviceID]);
});

app.post('/api/device/:id/camera', (req,res)=>{
  const deviceID = req.params.id;
  if(!devices[deviceID]) devices[deviceID]={};
  devices[deviceID].cameraFrame = req.body.frame;
  res.json({status:'ok'});
});

app.get('/api/device/:id/camera', (req,res)=>{
  const deviceID = req.params.id;
  if(devices[deviceID] && devices[deviceID].cameraFrame){
    res.json({frame: devices[deviceID].cameraFrame});
  } else {
    res.status(404).json({error:'No frame'});
  }
});

app.listen(port, ()=>console.log(`Server running at port ${port}`));
