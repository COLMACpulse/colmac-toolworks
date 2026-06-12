
const PRIORITY={distress:1,move_commit:2,short_message:3,peer_state:4,marker:5,scan_summary:6,visual_summary:7,fusion_summary:8,preset:9};
const LINKS={local_only:'LOCAL ONLY',peer:'PEER',sat_gateway:'SAT GATEWAY',backhaul:'BACKHAUL'};
const state={operatorId:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),callsign:'',role:'field',mode:'sar',subjectType:'child',lkp:'',elapsedHours:2,notes:'',heading:null,linkState:'local_only',gatewayMode:false,gatewayAdapter:'none',resendWindowSec:20,maxRetries:4,packetQueue:[],sentPackets:[],ackedPackets:[],failedPackets:[],audio:null,audioScans:[],visual:null,gpsWatchId:null,gpsPoints:[],gpsMarkers:[],logs:[],signalEvents:[],committedMoves:[],messages:[],peers:new Map(),teamPackets:[],fusionPacket:null,fusionRuns:0,hotspotClusters:[],recognition:null,listening:false,stream:null,mapView:{zoom:1,panX:0,panY:0,dragging:false,lastX:0,lastY:0}};
const presets={child_trail:{subjectType:'child',elapsedHours:1.5,notes:'Trail-side behavior likely. Preserve path-of-least-resistance logic.'},elderly_urban:{subjectType:'elderly',elapsedHours:2,notes:'Short-range drift, confusion loops, check edges, alleys, parked vehicles, and thresholds.'},injured_drainage:{subjectType:'injured_adult',elapsedHours:3,notes:'Reduced mobility. Bias shelter pockets and drainage edges.'},night_wind:{subjectType:'unknown',elapsedHours:2,notes:'Audio value goes up. Visual confidence drops. Slow the team down.'}};
const el=id=>document.getElementById(id);
const refs={callsign:el('callsign'),roleSelect:el('roleSelect'),modeSelect:el('modeSelect'),modePill:el('modePill'),rolePill:el('rolePill'),linkPill:el('linkPill'),gatewayPill:el('gatewayPill'),queuePill:el('queuePill'),subjectType:el('subjectType'),lkp:el('lkp'),elapsedHours:el('elapsedHours'),contextNotes:el('contextNotes'),recomputeBtn:el('recomputeBtn'),clearMissionBtn:el('clearMissionBtn'),startGpsBtn:el('startGpsBtn'),stopGpsBtn:el('stopGpsBtn'),dropMarkerBtn:el('dropMarkerBtn'),gpsReadout:el('gpsReadout'),linkStateSelect:el('linkStateSelect'),gatewayAdapterSelect:el('gatewayAdapterSelect'),gatewayModeBtn:el('gatewayModeBtn'),flushQueueBtn:el('flushQueueBtn'),gatewayBox:el('gatewayBox'),resendWindowInput:el('resendWindowInput'),maxRetriesInput:el('maxRetriesInput'),runResendSweepBtn:el('runResendSweepBtn'),ackTopBtn:el('ackTopBtn'),ackBox:el('ackBox'),saveSessionBtn:el('saveSessionBtn'),loadSessionInput:el('loadSessionInput'),sessionBox:el('sessionBox'),scanBtn:el('scanBtn'),viewBtn:el('viewBtn'),moveBtn:el('moveBtn'),audioState:el('audioState'),headingState:el('headingState'),cameraState:el('cameraState'),visualBand:el('visualBand'),audioMeter:el('audioMeter').querySelector('span'),statRms:el('statRms'),statHz:el('statHz'),statZcr:el('statZcr'),statClass:el('statClass'),audioInterpretation:el('audioInterpretation'),signalTimeline:el('signalTimeline'),video:el('video'),overlay:el('overlay'),cameraOverlayText:el('cameraOverlayText'),startCameraBtn:el('startCameraBtn'),captureBtn:el('captureBtn'),stopCameraBtn:el('stopCameraBtn'),visualInterpretation:el('visualInterpretation'),cameraTags:el('cameraTags'),signalMap:el('signalMap'),mapState:el('mapState'),clusterState:el('clusterState'),fusionState:el('fusionState'),fusionBox:el('fusionBox'),queueBox:el('queueBox'),runFusionBtn:el('runFusionBtn'),replayBtn:el('replayBtn'),replayTimeline:el('replayTimeline'),runClusterBtn:el('runClusterBtn'),zoomInBtn:el('zoomInBtn'),zoomOutBtn:el('zoomOutBtn'),recenterBtn:el('recenterBtn'),confidenceRing:el('confidenceRing'),confidenceValue:el('confidenceValue'),confidenceBand:el('confidenceBand'),moveOutput:el('moveOutput'),decisionState:el('decisionState'),chosenMove:el('chosenMove'),commitMoveBtn:el('commitMoveBtn'),clearCommitBtn:el('clearCommitBtn'),commitState:el('commitState'),commitHistory:el('commitHistory'),roleBox:el('roleBox'),messageInput:el('messageInput'),sendMessageBtn:el('sendMessageBtn'),clearMessageBtn:el('clearMessageBtn'),messageLane:el('messageLane'),queueBoard:el('queueBoard'),unitBoard:el('unitBoard'),commandSummary:el('commandSummary'),logBtn:el('logBtn'),voiceLogBtn:el('voiceLogBtn'),logInput:el('logInput'),appendLogBtn:el('appendLogBtn'),logEntries:el('logEntries'),logState:el('logState'),exportTeamPacketBtn:el('exportTeamPacketBtn'),importTeamPacketInput:el('importTeamPacketInput'),teamPacketBox:el('teamPacketBox'),metricScans:el('metricScans'),metricCaptures:el('metricCaptures'),metricLogs:el('metricLogs'),metricCommits:el('metricCommits'),metricGps:el('metricGps'),metricMarkers:el('metricMarkers'),metricPeers:el('metricPeers'),metricQueued:el('metricQueued'),metricAcked:el('metricAcked'),metricFailed:el('metricFailed'),exportJsonBtn:el('exportJsonBtn'),exportReportBtn:el('exportReportBtn'),printBtn:el('printBtn')};
function init(){bind();setupHeading();setupRecognition();setupMapInteraction();refreshStatus();renderRoleLane();renderMovePacket();updateMetrics();renderMessages();renderPeers();renderQueueBoard();drawSignalMap()}
function bind(){refs.callsign.oninput=e=>{state.callsign=e.target.value;refreshStatus()};refs.roleSelect.onchange=e=>{state.role=e.target.value;refreshStatus();renderRoleLane()};refs.modeSelect.onchange=e=>{state.mode=e.target.value;refreshStatus();renderMovePacket()};refs.subjectType.onchange=e=>{state.subjectType=e.target.value;renderMovePacket()};refs.lkp.oninput=e=>state.lkp=e.target.value;refs.elapsedHours.oninput=e=>{state.elapsedHours=parseFloat(e.target.value||'0');renderMovePacket()};refs.contextNotes.oninput=e=>{state.notes=e.target.value;renderMovePacket()};refs.linkStateSelect.onchange=e=>{state.linkState=e.target.value;refreshStatus();maybeAutoFlush()};refs.gatewayAdapterSelect.onchange=e=>{state.gatewayAdapter=e.target.value;refreshStatus()};refs.resendWindowInput.oninput=e=>{state.resendWindowSec=Math.max(5,parseInt(e.target.value||'20',10));refreshStatus()};refs.maxRetriesInput.oninput=e=>{state.maxRetries=Math.max(1,parseInt(e.target.value||'4',10));refreshStatus()};document.querySelectorAll('.preset').forEach(btn=>btn.onclick=()=>applyPreset(btn.dataset.preset));refs.recomputeBtn.onclick=renderMovePacket;refs.clearMissionBtn.onclick=clearMission;refs.startGpsBtn.onclick=startGps;refs.stopGpsBtn.onclick=stopGps;refs.dropMarkerBtn.onclick=dropMarker;refs.gatewayModeBtn.onclick=toggleGatewayMode;refs.flushQueueBtn.onclick=flushQueue;refs.runResendSweepBtn.onclick=runResendSweep;refs.ackTopBtn.onclick=ackTopPacket;refs.saveSessionBtn.onclick=saveSessionFile;refs.loadSessionInput.onchange=loadSessionFile;refs.scanBtn.onclick=runAudioScan;refs.viewBtn.onclick=async()=>{if(!state.stream)await startCamera();else captureFrame()};refs.moveBtn.onclick=renderMovePacket;refs.startCameraBtn.onclick=startCamera;refs.captureBtn.onclick=captureFrame;refs.stopCameraBtn.onclick=stopCamera;refs.runFusionBtn.onclick=runFusionEngine;refs.runClusterBtn.onclick=runHotspotClustering;refs.replayBtn.onclick=replayTimeline;refs.zoomInBtn.onclick=()=>{state.mapView.zoom=Math.min(6,state.mapView.zoom*1.2);drawSignalMap()};refs.zoomOutBtn.onclick=()=>{state.mapView.zoom=Math.max(.4,state.mapView.zoom/1.2);drawSignalMap()};refs.recenterBtn.onclick=()=>{state.mapView={...state.mapView,zoom:1,panX:0,panY:0};drawSignalMap()};refs.commitMoveBtn.onclick=commitMove;refs.clearCommitBtn.onclick=()=>refs.chosenMove.value='';refs.sendMessageBtn.onclick=queueShortMessage;refs.clearMessageBtn.onclick=()=>refs.messageInput.value='';refs.logBtn.onclick=appendLogEntry;refs.voiceLogBtn.onclick=toggleVoiceLog;refs.appendLogBtn.onclick=appendLogEntry;refs.exportTeamPacketBtn.onclick=exportPacketBundle;refs.importTeamPacketInput.onchange=importPacketBundle;refs.exportJsonBtn.onclick=exportJson;refs.exportReportBtn.onclick=exportReport;refs.printBtn.onclick=()=>window.print()}
function applyPreset(key){const p=presets[key];if(!p)return;state.subjectType=p.subjectType;state.elapsedHours=p.elapsedHours;state.notes=p.notes;refs.subjectType.value=p.subjectType;refs.elapsedHours.value=String(p.elapsedHours);refs.contextNotes.value=p.notes;addSignalEvent('preset',`Applied preset: ${key.replaceAll('_',' ')}`);queuePacket(buildPacket('preset',{preset:key}));renderMovePacket()}
function buildPacket(type,payload={}){return{version:'v09_gateway_ack',id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),type,priority:PRIORITY[type]??9,operator_id:state.operatorId,callsign:state.callsign||'Unnamed',role:state.role,created_at:new Date().toISOString(),last_attempt_at:null,retry_count:0,ack_status:'queued',payload}}
function sortQueue(){state.packetQueue.sort((a,b)=>a.priority!==b.priority?a.priority-b.priority:new Date(a.created_at)-new Date(b.created_at))}
function queuePacket(packet){state.packetQueue.push(packet);sortQueue();refreshStatus();updateMetrics();renderQueueBoard();maybeAutoFlush()}
function toggleGatewayMode(){state.gatewayMode=!state.gatewayMode;refreshStatus();maybeAutoFlush()}
function adapterAvailable(){return state.gatewayAdapter!=='none'||state.linkState==='peer'}
function canSend(){if(state.linkState==='local_only')return false;if(state.linkState==='sat_gateway'&&!state.gatewayMode)return false;if(!adapterAvailable())return false;return true}
function maybeAutoFlush(){if(canSend())flushQueue()}
function markSent(packet){packet.last_attempt_at=new Date().toISOString();packet.retry_count+=1;packet.ack_status='sent';state.sentPackets.unshift({...packet})}
function flushQueue(){if(!canSend()||!state.packetQueue.length){refreshStatus();return}let sentCount=0;const remaining=[];for(const packet of state.packetQueue){if(packet.ack_status==='acked'||packet.ack_status==='failed')continue;markSent(packet);applyPacketLocally(packet);sentCount+=1;remaining.push(packet)}state.packetQueue=remaining;refreshStatus();updateMetrics();renderMessages();renderPeers();renderQueueBoard();refs.ackBox.innerHTML=`Flushed <strong>${sentCount}</strong> packet(s).<br>Awaiting ACK for sent packets.`}
function applyPacketLocally(packet){if(packet.type==='short_message'){const m={...packet.payload,pending:true,packet_id:packet.id};state.messages.unshift(m)}else if(packet.type==='peer_state'){state.peers.set(packet.operator_id,packet.payload)}}
function runResendSweep(){const now=Date.now();let resent=0;for(const packet of state.packetQueue){if(packet.ack_status==='acked'||packet.ack_status==='failed')continue;const last=packet.last_attempt_at?new Date(packet.last_attempt_at).getTime():0;const due=!last||((now-last)/1000)>=state.resendWindowSec;if(!due)continue;if(packet.retry_count>=state.maxRetries){packet.ack_status='failed';state.failedPackets.unshift({...packet,failed_at:new Date().toISOString()});continue}if(canSend()){markSent(packet);resent+=1}}refreshStatus();updateMetrics();renderQueueBoard();refs.ackBox.innerHTML=`Resend sweep complete.<br>Resent: <strong>${resent}</strong> • Failed total: <strong>${state.failedPackets.length}</strong>`}
function ackTopPacket(){const candidate=state.packetQueue.find(p=>p.ack_status==='sent');if(!candidate){refs.ackBox.innerHTML='No sent packet awaiting ACK.';return}candidate.ack_status='acked';state.ackedPackets.unshift({...candidate,acked_at:new Date().toISOString()});state.packetQueue=state.packetQueue.filter(p=>p.id!==candidate.id);state.messages=state.messages.map(m=>m.packet_id===candidate.id?{...m,pending:false}:m);refreshStatus();updateMetrics();renderMessages();renderQueueBoard();refs.ackBox.innerHTML=`ACK received for <strong>${candidate.type}</strong><br>Packet ${candidate.id.slice(0,8)}… removed from queue.`}
function queueShortMessage(){const text=refs.messageInput.value.trim();if(!text)return;const message={time:new Date().toLocaleTimeString(),from:state.callsign||'Unnamed',role:state.role,text};refs.messageInput.value='';queuePacket(buildPacket('short_message',message));state.messages.unshift({...message,pending:true,packet_id:state.packetQueue[0]?.id}) ;renderMessages()}
function buildPeerState(){return{callsign:state.callsign||'Unnamed',role:state.role,mode:state.mode,gpsPoint:state.gpsPoints[state.gpsPoints.length-1]||null,audio:state.audio?{confidence:state.audio.classification?.confidence||0,label:state.audio.classification?.label||'',heading:state.audio.heading}:null,commit:state.committedMoves[0]||null}}
function queuePeerState(reason='update'){queuePacket(buildPacket('peer_state',{reason,...buildPeerState()}))}
function renderMessages(){refs.messageLane.innerHTML='';state.messages.slice(0,20).forEach(m=>{const d=document.createElement('div');d.className='timeline-item';d.innerHTML=`<div class="timeline-item-head"><strong>${m.from}</strong><span class="tag">${m.role} • ${m.time}${m.pending?' • pending':''}</span></div><div>${m.text}</div>`;refs.messageLane.appendChild(d)})}
function renderPeers(){refs.unitBoard.innerHTML='';const self=buildPeerState();const units=[self,...state.peers.values()];units.forEach(u=>{const d=document.createElement('div');d.className='timeline-item';d.innerHTML=`<div class="timeline-item-head"><strong>${u.callsign||'Unnamed'}</strong><span class="tag">${u.role||'field'}</span></div><div>Mode: ${u.mode||'-'}<br>${u.gpsPoint?`GPS: ${u.gpsPoint.lat.toFixed(5)}, ${u.gpsPoint.lon.toFixed(5)}`:'GPS: none'}<br>${u.audio?`Audio: ${Math.round((u.audio.confidence||0)*100)}% ${u.audio.label||''}`:'Audio: none'}<br>${u.commit?`Commit: ${u.commit.text}`:'Commit: none'}</div>`;refs.unitBoard.appendChild(d)});const top=state.hotspotClusters[0];refs.commandSummary.innerHTML=`Visible units: <strong>${units.length}</strong><br>Queue depth: <strong>${state.packetQueue.length}</strong><br>ACKed: <strong>${state.ackedPackets.length}</strong><br>Failed: <strong>${state.failedPackets.length}</strong><br>Link state: <strong>${LINKS[state.linkState]}</strong><br>Top hotspot: <strong>${top?`${top.label} (${top.score.toFixed(2)})`:'none'}</strong>`}

function packetTimestampMs(packet){
  const raw = packet.last_attempt_at || packet.created_at || new Date().toISOString();
  return new Date(raw).getTime();
}
function packetAgeState(packet){
  const ageMs = Date.now() - packetTimestampMs(packet);
  if(ageMs < 30000) return 'active';
  if(ageMs < 120000) return 'stale';
  return 'cold';
}
function packetAgeSeconds(packet){
  return Math.max(0, Math.floor((Date.now() - packetTimestampMs(packet))/1000));
}
function packetAckVisual(packet){
  if(!packet) return {status:'none', color:'rgba(119,200,255,.85)', alpha:0.9, age:'active'};
  const age = packetAgeState(packet);
  let color = 'rgba(255,206,99,.95)';
  if(packet.ack_status === 'acked') color = 'rgba(100,217,138,.95)';
  else if(packet.ack_status === 'failed') color = 'rgba(255,143,143,.95)';
  const alpha = age === 'active' ? 0.95 : age === 'stale' ? 0.68 : 0.38;
  return {status:packet.ack_status || 'queued', color, alpha, age};
}
function markerPacketForLabel(label){
  const all = [...state.packetQueue, ...state.ackedPackets, ...state.failedPackets, ...state.sentPackets];
  const matches = all.filter(p => p.type === 'marker' && p.payload && p.payload.label === label);
  if(!matches.length) return null;
  matches.sort((a,b)=>new Date((b.last_attempt_at||b.created_at)) - new Date((a.last_attempt_at||a.created_at)));
  return matches[0];
}
function renderQueueBoard(){
  refs.queueBoard.innerHTML='';
  if(!state.packetQueue.length){
    refs.queueBoard.innerHTML='<div class="timeline-item">Queue empty.</div>';
    return;
  }
  state.packetQueue.slice(0,20).forEach(p=>{
    const age = packetAgeState(p);
    const ageSec = packetAgeSeconds(p);
    const d=document.createElement('div');
    d.className=`timeline-item queue-status-${p.ack_status || 'queued'} queue-age-${age}`;
    d.innerHTML=`<div class="timeline-item-head"><strong>${p.type}</strong><span class="tag">p${p.priority} • ${p.ack_status}</span></div><div>Retries: ${p.retry_count}/${state.maxRetries}<br>Age: <span class="tag-age">${ageSec}s • ${age}</span><br>Created: ${new Date(p.created_at).toLocaleTimeString()}<br>${p.last_attempt_at?`Last attempt: ${new Date(p.last_attempt_at).toLocaleTimeString()}`:'Not sent yet'}</div>`;
    refs.queueBoard.appendChild(d);
  });
}
function refreshStatus(){
  refs.modePill.textContent=`MODE: ${state.mode.toUpperCase()}`;
  refs.rolePill.textContent=`ROLE: ${state.role.toUpperCase()}`;
  refs.linkPill.textContent=`LINK: ${LINKS[state.linkState]}`;
  refs.gatewayPill.textContent=`GATEWAY: ${state.gatewayMode?'ON':'OFF'} / ${state.gatewayAdapter.replaceAll('_',' ').toUpperCase()}`;
  refs.queuePill.textContent=`QUEUE: ${state.packetQueue.length}`;
  const queued = state.packetQueue.filter(p=>p.ack_status==='queued').length;
  const sent = state.packetQueue.filter(p=>p.ack_status==='sent').length;
  refs.gatewayBox.innerHTML=`Gateway mode: <strong>${state.gatewayMode?'ON':'OFF'}</strong><br>Adapter: <strong>${state.gatewayAdapter.replaceAll('_',' ')}</strong><br>Link state: <strong>${LINKS[state.linkState]}</strong>`;
  refs.ackBox.innerHTML=`Resend window: <strong>${state.resendWindowSec}s</strong><br>Max retries: <strong>${state.maxRetries}</strong><br>Queued: <strong>${queued}</strong> • Sent: <strong>${sent}</strong><br>ACKed: <strong>${state.ackedPackets.length}</strong> • Failed: <strong>${state.failedPackets.length}</strong>`;
  refs.queueBox.innerHTML=state.packetQueue.length?`<strong>Queue state</strong><br>${state.packetQueue.slice(0,6).map(p=>`${p.type} • ${p.ack_status} • ${packetAgeState(p)}`).join('<br>')}`:'Queue empty.';
}
function renderRoleLane(){refs.roleBox.textContent=state.role==='lead'?'LEAD lane: review queue pressure, push high-priority packets first, and protect signal integrity.':'FIELD lane: capture local truth, queue only what matters, and preserve bandwidth discipline.'}
function setupHeading(){if('DeviceOrientationEvent'in window){window.addEventListener('deviceorientation',event=>{if(typeof event.alpha==='number'){state.heading=(360-event.alpha+360)%360;refs.headingState.textContent=`heading ${Math.round(state.heading)}°`}})}}
function setupRecognition(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){refs.voiceLogBtn.disabled=true;refs.logState.textContent='speech api unavailable';return}const rec=new SR();rec.continuous=true;rec.interimResults=true;rec.onresult=event=>{let text='';for(let i=event.resultIndex;i<event.results.length;i++)text+=event.results[i][0].transcript;refs.logInput.value=text};rec.onstart=()=>{state.listening=true;refs.logState.textContent='listening'};rec.onend=()=>{state.listening=false;refs.logState.textContent='manual'};rec.onerror=()=>{state.listening=false;refs.logState.textContent='speech error'};state.recognition=rec}
function toggleVoiceLog(){if(!state.recognition)return;state.listening?state.recognition.stop():state.recognition.start()}
function setupMapInteraction(){const canvas=refs.signalMap;canvas.addEventListener('mousedown',e=>{state.mapView.dragging=true;state.mapView.lastX=e.clientX;state.mapView.lastY=e.clientY;canvas.classList.add('dragging')});window.addEventListener('mousemove',e=>{if(!state.mapView.dragging)return;state.mapView.panX+=e.clientX-state.mapView.lastX;state.mapView.panY+=e.clientY-state.mapView.lastY;state.mapView.lastX=e.clientX;state.mapView.lastY=e.clientY;drawSignalMap()});window.addEventListener('mouseup',()=>{state.mapView.dragging=false;canvas.classList.remove('dragging')});canvas.addEventListener('wheel',e=>{e.preventDefault();state.mapView.zoom=e.deltaY<0?Math.min(6,state.mapView.zoom*1.08):Math.max(.4,state.mapView.zoom/1.08);drawSignalMap()},{passive:false})}
function startGps(){if(!navigator.geolocation){refs.gpsReadout.textContent='Geolocation unavailable.';return}if(state.gpsWatchId)return;state.gpsWatchId=navigator.geolocation.watchPosition(onGpsPosition,onGpsError,{enableHighAccuracy:true,maximumAge:3000,timeout:10000});refs.gpsReadout.textContent='GPS starting...'}
function stopGps(){if(state.gpsWatchId!=null)navigator.geolocation.clearWatch(state.gpsWatchId);state.gpsWatchId=null;refs.gpsReadout.textContent='GPS stopped.';queuePeerState('gps_stop')}
function onGpsPosition(pos){const point={lat:pos.coords.latitude,lon:pos.coords.longitude,acc:pos.coords.accuracy,ts:new Date().toISOString(),heading:state.heading};const prev=state.gpsPoints[state.gpsPoints.length-1];if(!prev||gpsDistanceMeters(prev,point)>5){state.gpsPoints.push(point);refs.gpsReadout.innerHTML=`Lat: <strong>${point.lat.toFixed(6)}</strong><br>Lon: <strong>${point.lon.toFixed(6)}</strong><br>Accuracy: <strong>±${Math.round(point.acc)}m</strong><br>Points: <strong>${state.gpsPoints.length}</strong>`;addSignalEvent('gps',`GPS point • ±${Math.round(point.acc)}m`);updateMetrics();drawSignalMap();queuePeerState('gps')}}
function onGpsError(err){refs.gpsReadout.textContent=`GPS error: ${err.message}`}
function dropMarker(){if(!state.gpsPoints.length){refs.gpsReadout.textContent='Need at least one GPS point before dropping a marker.';return}const last=state.gpsPoints[state.gpsPoints.length-1];const m={...last,label:`M${state.gpsMarkers.length+1}`};state.gpsMarkers.push(m);addSignalEvent('marker',`Dropped marker ${m.label}`);updateMetrics();drawSignalMap();queuePacket(buildPacket('marker',m))}
async function runAudioScan(){refs.audioState.textContent='arming';try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});refs.audioState.textContent='recording';const audioContext=new(window.AudioContext||window.webkitAudioContext)();const source=audioContext.createMediaStreamSource(stream),analyser=audioContext.createAnalyser();analyser.fftSize=2048;source.connect(analyser);const timeData=new Float32Array(analyser.fftSize),freqData=new Uint8Array(analyser.frequencyBinCount),frames=[];const start=performance.now();await new Promise(resolve=>{function tick(){analyser.getFloatTimeDomainData(timeData);analyser.getByteFrequencyData(freqData);const f=computeFeatures(timeData,freqData,audioContext.sampleRate);frames.push(f);refs.audioMeter.style.width=`${Math.min(100,f.rms*420)}%`;refs.statRms.textContent=f.rms.toFixed(3);refs.statHz.textContent=String(Math.round(f.peakHz));refs.statZcr.textContent=f.zcr.toFixed(3);refs.statClass.textContent=classifySignal(f).label;if(performance.now()-start<12000)requestAnimationFrame(tick);else resolve()}tick()});const aggregate=summarizeFrames(frames),cls=classifySignal(aggregate);aggregate.classification=cls;aggregate.scanPointIndex=state.gpsPoints.length?state.gpsPoints.length-1:null;state.audio=aggregate;state.audioScans.push(aggregate);refs.audioState.textContent='complete';refs.audioInterpretation.innerHTML=buildAudioInterpretation(aggregate,cls);addSignalEvent('scan',`${cls.label} • ${Math.round(cls.confidence*100)}%`);queuePacket(buildPacket('scan_summary',{classification:cls.label,confidence:Number(cls.confidence.toFixed(2)),heading:aggregate.heading==null?null:Math.round(aggregate.heading),scan_point_index:aggregate.scanPointIndex}));updateMetrics();drawSignalMap();renderMovePacket();stream.getTracks().forEach(t=>t.stop());audioContext.close()}catch(err){refs.audioState.textContent='blocked';refs.audioInterpretation.textContent=`Microphone unavailable: ${err.message}`}}
function computeFeatures(timeData,freqData,sampleRate){let sumSq=0,zc=0;for(let i=0;i<timeData.length;i++){const v=timeData[i];sumSq+=v*v;if(i>0&&Math.sign(timeData[i])!==Math.sign(timeData[i-1]))zc++}const rms=Math.sqrt(sumSq/timeData.length);let peakIndex=0,peakVal=-1;for(let i=0;i<freqData.length;i++){if(freqData[i]>peakVal){peakVal=freqData[i];peakIndex=i}}const peakHz=peakIndex*sampleRate/(2*freqData.length);return{rms,zcr:zc/timeData.length,peakHz,peakVal}}
function summarizeFrames(frames){const avg=key=>frames.reduce((a,f)=>a+f[key],0)/Math.max(frames.length,1),max=key=>Math.max(...frames.map(f=>f[key]));return{rms:avg('rms'),zcr:avg('zcr'),peakHz:avg('peakHz'),peakVal:max('peakVal'),heading:state.heading,capturedAt:new Date().toISOString()}}
function classifySignal(f){let scoreHuman=0,scoreTap=0,scoreWind=0,scoreMechanical=0;if(f.rms>0.03&&f.rms<0.18)scoreHuman+=0.24;if(f.peakHz>250&&f.peakHz<1800)scoreHuman+=0.3;if(f.zcr>0.03&&f.zcr<0.18)scoreHuman+=0.18;if(f.peakHz>1800&&f.zcr>0.12)scoreTap+=0.36;if(f.rms>0.02&&f.rms<0.12)scoreTap+=0.12;if(f.peakHz<250&&f.zcr<0.05)scoreWind+=0.30;if(f.rms>0.015)scoreWind+=0.10;if(f.peakHz>80&&f.peakHz<400&&f.rms>0.06)scoreMechanical+=0.32;if(f.zcr<0.06)scoreMechanical+=0.14;const candidates=[{label:'possible human voice / whistle',score:scoreHuman},{label:'possible rhythmic tapping',score:scoreTap},{label:'possible wind / water wash',score:scoreWind},{label:'possible machinery / engine',score:scoreMechanical}].sort((a,b)=>b.score-a.score);const top=candidates[0],confidence=clamp(0.18+top.score,0.05,0.86);return{...top,confidence,ranked:candidates}}
function buildAudioInterpretation(f,cls){const headingText=f.heading==null?'Direction unavailable on this device.':`Phone heading during strongest scan: <strong>${Math.round(f.heading)}°</strong>.`;return `<strong>Signal summary</strong><br>Class: <strong>${cls.label}</strong><br>Confidence: <strong>${bandLabel(cls.confidence)}</strong> (${cls.confidence.toFixed(2)})<br>Energy: <strong>${f.rms.toFixed(3)}</strong> • Peak: <strong>${Math.round(f.peakHz)} Hz</strong> • ZCR: <strong>${f.zcr.toFixed(3)}</strong><br>${headingText}`}
async function startCamera(){try{state.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});refs.video.srcObject=state.stream;refs.cameraState.textContent='camera live';refs.cameraOverlayText.textContent='Camera live • overlay assist active';requestAnimationFrame(drawOverlay)}catch(err){refs.cameraState.textContent='blocked';refs.visualInterpretation.textContent=`Camera unavailable: ${err.message}`}}
function stopCamera(){if(state.stream)state.stream.getTracks().forEach(t=>t.stop());state.stream=null;refs.video.srcObject=null;refs.cameraState.textContent='camera off';refs.cameraOverlayText.textContent='Camera standby';const ctx=refs.overlay.getContext('2d');ctx.clearRect(0,0,refs.overlay.width,refs.overlay.height)}
function drawOverlay(){if(!state.stream||refs.video.readyState<2)return;const canvas=refs.overlay,video=refs.video,ctx=canvas.getContext('2d');if(canvas.width!==video.videoWidth||canvas.height!==video.videoHeight){canvas.width=video.videoWidth;canvas.height=video.videoHeight}ctx.clearRect(0,0,canvas.width,canvas.height);ctx.lineWidth=3;ctx.strokeStyle='rgba(119,200,255,.75)';ctx.strokeRect(canvas.width*.16,canvas.height*.16,canvas.width*.68,canvas.height*.68);if(state.audio?.classification?.confidence>0.45&&state.audio.heading!=null){ctx.fillStyle='rgba(150,240,191,.82)';ctx.font='bold 28px system-ui';ctx.fillText(`Audio bias ${Math.round(state.audio.heading)}°`,22,40)}requestAnimationFrame(drawOverlay)}
function captureFrame(){if(!state.stream||refs.video.readyState<2){refs.visualInterpretation.textContent='Start camera first.';return}const canvas=document.createElement('canvas');canvas.width=refs.video.videoWidth;canvas.height=refs.video.videoHeight;const ctx=canvas.getContext('2d');ctx.drawImage(refs.video,0,0,canvas.width,canvas.height);const imageData=ctx.getImageData(0,0,canvas.width,canvas.height);const summary=analyzeFrame(imageData);state.visual=summary;refs.visualBand.textContent=`${summary.zone}`;refs.visualInterpretation.innerHTML=`<strong>Visual capture</strong><br>Brightness variance: <strong>${summary.variance.toFixed(1)}</strong><br>Edge density: <strong>${summary.edgeDensity.toFixed(3)}</strong><br>Contrast zone: <strong>${summary.zone}</strong><br>Read: <strong>${summary.read}</strong>`;refs.cameraOverlayText.textContent=`Capture read • ${summary.read}`;refs.cameraTags.innerHTML='';summary.tags.forEach(tag=>{const d=document.createElement('div');d.className='camera-tag';d.textContent=tag;refs.cameraTags.appendChild(d)});addSignalEvent('visual',`${summary.zone} • ${summary.read}`);queuePacket(buildPacket('visual_summary',{zone:summary.zone,read:summary.read}));updateMetrics();renderMovePacket()}
function analyzeFrame(imageData){const data=imageData.data;let prevLum=0,sum=0,sumSq=0,edges=0,count=0;const sampleStep=16;for(let i=0;i<data.length;i+=4*sampleStep){const lum=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];sum+=lum;sumSq+=lum*lum;if(count>0&&Math.abs(lum-prevLum)>40)edges++;prevLum=lum;count++}const mean=sum/count,variance=(sumSq/count)-mean*mean,edgeDensity=edges/count;let zone='balanced',read='normal scene complexity',tags=['scene stable'];if(variance>2000&&edgeDensity>.22){zone='high contrast';read='dense visual disruption · inspect trails, brush breaks, bright fabric, gear';tags=['high contrast','inspect breaks','check bright fabric']}else if(variance<600){zone='flat / low contrast';read='scene visually flat · rely more on audio + movement + search spacing';tags=['flat scene','audio heavier','tight sweep discipline']}else if(edgeDensity>.16){zone='complex texture';read='brush / rock clutter likely · slow scan and use overlap';tags=['complex texture','slow visual scan','overlap lanes']}return{variance,edgeDensity,zone,read,tags,capturedAt:new Date().toISOString()}}
function runFusionEngine(){if(!state.audioScans.length){refs.fusionState.textContent='need scans';refs.fusionBox.textContent='Need at least one audio scan before fusion.';return}const recent=state.audioScans.slice(-6),bestScan=recent.reduce((a,b)=>a.classification.confidence>b.classification.confidence?a:b),avgConf=recent.reduce((a,s)=>a+s.classification.confidence,0)/recent.length,headings=recent.filter(s=>typeof s.heading==='number').map(s=>s.heading),avgHeading=headings.length?circularMean(headings):null,trend=recent.length>=3?(recent[recent.length-1].classification.confidence>=recent[0].classification.confidence?'strengthening':'weakening'):'early';state.fusionPacket={scanCount:recent.length,fusedConfidence:avgConf,avgHeading,bestScan,trend};state.fusionRuns+=1;refs.fusionState.textContent='fused';refs.fusionBox.innerHTML=`<strong>Fusion packet</strong><br>Scans: <strong>${recent.length}</strong><br>Avg confidence: <strong>${avgConf.toFixed(2)}</strong><br>Trend: <strong>${trend}</strong><br>Best scan: <strong>${bestScan.classification.label}</strong><br>${avgHeading==null?'Direction unresolved.':`Mean heading: <strong>${Math.round(avgHeading)}°</strong>`}`;queuePacket(buildPacket('fusion_summary',{scan_count:recent.length,fused_confidence:Number(avgConf.toFixed(2)),trend,best_label:bestScan.classification.label}));addSignalEvent('fusion',`Fusion run • ${recent.length} scans • ${trend}`);renderMovePacket()}
function runHotspotClustering(){const evidence=[];state.audioScans.forEach((scan,i)=>{const loc=scanLocation(scan);if(loc)evidence.push({...loc,weight:scan.classification.confidence,label:`S${i+1}`})});state.gpsMarkers.forEach((m,i)=>{const loc=projectPoint(m);if(loc)evidence.push({...loc,weight:.55,label:m.label||`M${i+1}`})});[...state.peers.values()].forEach((peer,i)=>{if(peer.gpsPoint){const loc=projectPoint(peer.gpsPoint);if(loc)evidence.push({...loc,weight:.45+(peer.audio?.confidence||0)*.4,label:peer.callsign||`P${i+1}`})}});if(!evidence.length){refs.clusterState.textContent='no evidence';state.hotspotClusters=[];drawSignalMap();renderMovePacket();return}const threshold=28,clusters=[];evidence.forEach(ev=>{let target=null;for(const c of clusters){const dx=ev.x-c.cx,dy=ev.y-c.cy;if(Math.sqrt(dx*dx+dy*dy)<=threshold){target=c;break}}if(!target){target={points:[],sumW:0,wx:0,wy:0,score:0,labels:[]};clusters.push(target)}target.points.push(ev);target.sumW+=ev.weight;target.wx+=ev.x*ev.weight;target.wy+=ev.y*ev.weight;target.score+=ev.weight;target.labels.push(ev.label);target.cx=target.wx/target.sumW;target.cy=target.wy/target.sumW});state.hotspotClusters=clusters.map((c,i)=>({x:c.cx,y:c.cy,score:c.score,size:c.points.length,label:`H${i+1}`,summary:`${c.points.length} evidence points • ${c.labels.join(', ')}`})).sort((a,b)=>b.score-a.score);refs.clusterState.textContent=`${state.hotspotClusters.length} cluster${state.hotspotClusters.length===1?'':'s'}`;drawSignalMap();renderMovePacket()}
function computeDecision(){let confidence=.18;const signalSummary=[],terrainRead=[],patternMatch=[],nextMove=[];const activeScan=state.fusionPacket?.bestScan||state.audio;if(activeScan){signalSummary.push(`${activeScan.classification.label} → ${Math.round(activeScan.classification.confidence*100)}%`);if(activeScan.heading!=null)signalSummary.push(`directional bias → ${Math.round(activeScan.heading)}°`);confidence+=activeScan.classification.confidence*.28}else{signalSummary.push('no fresh audio sweep');nextMove.push('run an audio sweep before committing to a directional shift')}if(state.fusionPacket){signalSummary.push(`fusion lane → ${state.fusionPacket.scanCount} scans combined`);patternMatch.push(`fused confidence trend → ${state.fusionPacket.trend}`);confidence+=state.fusionPacket.fusedConfidence*.14}if(state.hotspotClusters.length){patternMatch.push(`${state.hotspotClusters.length} hotspot cluster(s) active`);nextMove.push(`inspect hotspot ${state.hotspotClusters[0].label} first`);confidence+=Math.min(.08,state.hotspotClusters[0].score*.08)}if(state.packetQueue.length)patternMatch.push(`packet backlog active → ${state.packetQueue.length}`);if(state.ackedPackets.length)patternMatch.push(`acked packet history → ${state.ackedPackets.length}`);if(state.failedPackets.length)patternMatch.push(`failed packet history → ${state.failedPackets.length}`);switch(state.subjectType){case'child':patternMatch.push('child model → follows least resistance, attraction to water/trail edges');confidence+=.09;break;case'elderly':patternMatch.push('elderly / confused model → disorientation loops and short-range drift');confidence+=.08;break;case'injured_adult':patternMatch.push('injured adult model → reduced mobility, shelter-seeking, may answer intermittently');confidence+=.10;break;case'adult':patternMatch.push('adult model → route intent stronger, may self-correct toward roads or landmarks');confidence+=.05;break;default:patternMatch.push('subject unknown → keep guidance conservative')}if(state.elapsedHours>=4){patternMatch.push('extended elapsed time → widen radius but preserve high-probability corridors');nextMove.push('mark cleared zones cleanly to avoid duplicate coverage');confidence+=.05}if(state.visual){terrainRead.push(`${state.visual.zone} visual field → ${state.visual.read}`);confidence+=state.visual.edgeDensity>.16?.04:.02}if(state.gpsPoints.length>1){patternMatch.push(`breadcrumb track active → ${state.gpsPoints.length} points`);nextMove.push('use breadcrumb trail to prevent drift and retrace cleanly if needed');confidence+=.04}if(state.gpsMarkers.length>0)patternMatch.push(`${state.gpsMarkers.length} marker(s) dropped for local reference`);if(state.lkp)nextMove.push(`anchor sweep to LKP: ${state.lkp}`);if(state.notes.trim())patternMatch.push('operator notes integrated into packet');if(state.linkState==='local_only')nextMove.push('preserve local truth and queue only minimal packets');if(!nextMove.length)nextMove.push('hold, gather more signal, then move with documented reason');confidence=clamp(confidence,.08,.95);return{confidence,signalSummary,terrainRead,patternMatch,nextMove,bandText:bandLabel(confidence).toLowerCase()+' packet'}}
function renderMovePacket(){const d=computeDecision();refs.confidenceValue.textContent=d.confidence.toFixed(2);refs.confidenceBand.textContent=bandLabel(d.confidence);refs.confidenceRing.style.background=`conic-gradient(var(--accent) ${Math.round(d.confidence*360)}deg, rgba(255,255,255,.08) 0deg)`;refs.decisionState.textContent=d.bandText;refs.moveOutput.innerHTML=`<strong>SIGNAL SUMMARY</strong><br>${d.signalSummary.join('<br>')}<br><br><strong>TERRAIN READ</strong><br>${d.terrainRead.join('<br>')||'pending'}<br><br><strong>PATTERN MATCH</strong><br>${d.patternMatch.join('<br>')}<br><br><strong>NEXT MOVE (ASSISTIVE)</strong><br>${d.nextMove.map(x=>`→ ${x}`).join('<br>')}<br><br><strong>CONFIDENCE</strong>: ${bandLabel(d.confidence)} (${d.confidence.toFixed(2)})`;renderPeers()}
function appendLogEntry(){const text=refs.logInput.value.trim();if(!text)return;state.logs.unshift({time:new Date().toLocaleString(),tag:state.mode.toUpperCase(),text});refs.logInput.value='';renderLogs();updateMetrics()}
function renderLogs(){refs.logEntries.innerHTML='';const tpl=el('logTemplate');state.logs.forEach(entry=>{const node=tpl.content.cloneNode(true);node.querySelector('.log-time').textContent=entry.time;node.querySelector('.log-tag').textContent=entry.tag;node.querySelector('.log-body').textContent=entry.text;refs.logEntries.appendChild(node)})}
function gpsDistanceMeters(a,b){const R=6371000,dLat=(b.lat-a.lat)*Math.PI/180,dLon=(b.lon-a.lon)*Math.PI/180,lat1=a.lat*Math.PI/180,lat2=b.lat*Math.PI/180,x=dLon*Math.cos((lat1+lat2)/2);return Math.sqrt((dLat*R)**2+(x*R)**2)}
function projectPoint(p){if(!state.gpsPoints.length||!p)return null;const base=state.gpsPoints[0];return{x:(p.lon-base.lon)*Math.cos(base.lat*Math.PI/180)*111320,y:(p.lat-base.lat)*110540}}
function scanLocation(scan){if(scan.scanPointIndex!=null&&state.gpsPoints[scan.scanPointIndex])return projectPoint(state.gpsPoints[scan.scanPointIndex]);if(state.gpsPoints.length)return projectPoint(state.gpsPoints[state.gpsPoints.length-1]);return null}
function drawSignalMap(){const canvas=refs.signalMap,rect=canvas.getBoundingClientRect();canvas.width=Math.max(300,rect.width*devicePixelRatio);canvas.height=Math.max(220,rect.height*devicePixelRatio);const ctx=canvas.getContext('2d');ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);const w=rect.width,h=rect.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#081016';ctx.fillRect(0,0,w,h);drawOfflineBasemap(ctx,w,h);const localPts=state.gpsPoints.length?state.gpsPoints.map(p=>projectPoint(p)).filter(Boolean):[];let all=[...localPts];state.hotspotClusters.forEach(c=>all.push({x:c.x,y:c.y}));[...state.peers.values()].forEach(peer=>{if(peer.gpsPoint){const pp=projectPoint(peer.gpsPoint);if(pp)all.push(pp)}});if(!all.length)return;const xs=all.map(p=>p.x),ys=all.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),pad=40,scale=Math.min((w-pad*2)/Math.max(1,maxX-minX||1),(h-pad*2)/Math.max(1,maxY-minY||1))*state.mapView.zoom,sx=x=>state.mapView.panX+pad+(x-minX)*scale,sy=y=>state.mapView.panY+h-pad-(y-minY)*scale;if(localPts.length){ctx.strokeStyle='rgba(119,200,255,.42)';ctx.lineWidth=2;ctx.beginPath();localPts.forEach((p,i)=>{const x=sx(p.x),y=sy(p.y);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke();localPts.forEach((p,i)=>{const x=sx(p.x),y=sy(p.y);ctx.fillStyle=i===localPts.length-1?'rgba(150,240,191,.95)':'rgba(119,200,255,.85)';ctx.beginPath();ctx.arc(x,y,i===localPts.length-1?5:4,0,Math.PI*2);ctx.fill()})}state.gpsMarkers.forEach(m=>{const pp=projectPoint(m);if(!pp)return;const pkt=markerPacketForLabel(m.label);const visual=packetAckVisual(pkt);const x=sx(pp.x),y=sy(pp.y);ctx.strokeStyle=visual.color.replace('.95', visual.alpha.toFixed(2));ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.stroke();ctx.fillStyle=`rgba(255,255,255,${Math.max(.28,visual.alpha)})`;ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,.92)';ctx.font='11px system-ui';ctx.fillText(`${m.label} ${visual.status}/${visual.age}`,x+10,y-6)});state.hotspotClusters.forEach((c,idx)=>{const x=sx(c.x),y=sy(c.y),r=18+c.score*10*state.mapView.zoom,grad=ctx.createRadialGradient(x,y,2,x,y,r);grad.addColorStop(0,idx===0?'rgba(255,143,143,.55)':'rgba(212,158,255,.42)');grad.addColorStop(1,'rgba(255,143,143,0)');ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle=idx===0?'rgba(255,143,143,.95)':'rgba(212,158,255,.82)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,Math.max(8,r*.35),0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff';ctx.font='12px system-ui';ctx.fillText(c.label,x+8,y-8)});[...state.peers.values()].forEach(peer=>{if(peer.gpsPoint){const pp=projectPoint(peer.gpsPoint);if(pp){const x=sx(pp.x),y=sy(pp.y);ctx.fillStyle='rgba(212,158,255,.9)';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(242,230,255,.95)';ctx.font='12px system-ui';ctx.fillText(peer.callsign||'Peer',x+8,y+4)}}})}
function drawOfflineBasemap(ctx,w,h){ctx.strokeStyle='rgba(255,255,255,.05)';for(let i=0;i<12;i++){const x=(i/11)*w,y=(i/11)*h;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}ctx.strokeStyle='rgba(119,200,255,.06)';ctx.lineWidth=1.5;ctx.beginPath();for(let x=0;x<=w;x+=32){const y=h*.65+Math.sin(x/70)*18;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke()}
function replayTimeline(){refs.replayTimeline.innerHTML='';const items=state.signalEvents.slice().reverse();if(!items.length){refs.replayTimeline.innerHTML='<div class="timeline-item">No events to replay yet.</div>';return}let i=0;const timer=setInterval(()=>{if(i>=items.length){clearInterval(timer);return}const item=items[i++],d=document.createElement('div');d.className='timeline-item';d.innerHTML=`<div class="timeline-item-head"><strong>${item.time}</strong><span class="tag">${item.tag}</span></div><div>${item.text}</div>`;refs.replayTimeline.appendChild(d);refs.replayTimeline.scrollTop=refs.replayTimeline.scrollHeight},450)}
function exportPacketBundle(){const bundle={exportedAt:new Date().toISOString(),packet_format:'v09_gateway_ack',queue:state.packetQueue,sent:state.sentPackets.slice(-100),acked:state.ackedPackets.slice(-100),failed:state.failedPackets.slice(-100),peer_state:Array.from(state.peers.entries()),messages:state.messages.slice(0,20)};downloadBlob(JSON.stringify(bundle,null,2),'fieldscope-packet-bundle.json','application/json')}
function importPacketBundle(evt){const file=evt.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);if(Array.isArray(data.acked))state.ackedPackets=[...data.acked,...state.ackedPackets];if(Array.isArray(data.failed))state.failedPackets=[...data.failed,...state.failedPackets];if(Array.isArray(data.sent)){data.sent.forEach(packet=>applyPacketLocally(packet))}refs.teamPacketBox.textContent=`Loaded bundle: ${file.name}`;renderMessages();renderPeers();refreshStatus();updateMetrics();renderQueueBoard()}catch(err){refs.teamPacketBox.textContent=`Import failed: ${err.message}`}evt.target.value=''};reader.readAsText(file)}
function saveSessionFile(){downloadBlob(JSON.stringify(buildExportPayload(),null,2),'fieldscope-session.json','application/json');refs.sessionBox.textContent='Session file exported.'}
function loadSessionFile(evt){const file=evt.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const data=JSON.parse(reader.result);hydrateFromPayload(data);refs.sessionBox.textContent=`Loaded session file: ${file.name}`}catch(err){refs.sessionBox.textContent=`Session load failed: ${err.message}`}evt.target.value=''};reader.readAsText(file)}
function buildExportPayload(){return{exportedAt:new Date().toISOString(),mission:{callsign:state.callsign,role:state.role,mode:state.mode,subjectType:state.subjectType,lkp:state.lkp,elapsedHours:state.elapsedHours,notes:state.notes},linkState:state.linkState,gatewayMode:state.gatewayMode,gatewayAdapter:state.gatewayAdapter,resendWindowSec:state.resendWindowSec,maxRetries:state.maxRetries,packetQueue:state.packetQueue,sentPackets:state.sentPackets,ackedPackets:state.ackedPackets,failedPackets:state.failedPackets,gpsPoints:state.gpsPoints,gpsMarkers:state.gpsMarkers,audio:state.audio,audioScans:state.audioScans,visual:state.visual,signalEvents:state.signalEvents,committedMoves:state.committedMoves,logs:state.logs,messages:state.messages,peerState:Array.from(state.peers.entries()),fusionPacket:state.fusionPacket,fusionRuns:state.fusionRuns,hotspotClusters:state.hotspotClusters}}
function hydrateFromPayload(data){const m=data.mission||{};state.callsign=m.callsign||'';state.role=m.role||'field';state.mode=m.mode||'sar';state.subjectType=m.subjectType||'child';state.lkp=m.lkp||'';state.elapsedHours=m.elapsedHours??2;state.notes=m.notes||'';state.linkState=data.linkState||'local_only';state.gatewayMode=!!data.gatewayMode;state.gatewayAdapter=data.gatewayAdapter||'none';state.resendWindowSec=data.resendWindowSec||20;state.maxRetries=data.maxRetries||4;state.packetQueue=data.packetQueue||[];state.sentPackets=data.sentPackets||[];state.ackedPackets=data.ackedPackets||[];state.failedPackets=data.failedPackets||[];state.gpsPoints=data.gpsPoints||[];state.gpsMarkers=data.gpsMarkers||[];state.audio=data.audio||null;state.audioScans=data.audioScans||[];state.visual=data.visual||null;state.signalEvents=data.signalEvents||[];state.committedMoves=data.committedMoves||[];state.logs=data.logs||[];state.messages=data.messages||[];state.fusionPacket=data.fusionPacket||null;state.fusionRuns=data.fusionRuns||0;state.hotspotClusters=data.hotspotClusters||[];state.peers=new Map(data.peerState||[]);refs.callsign.value=state.callsign;refs.roleSelect.value=state.role;refs.modeSelect.value=state.mode;refs.subjectType.value=state.subjectType;refs.lkp.value=state.lkp;refs.elapsedHours.value=String(state.elapsedHours);refs.contextNotes.value=state.notes;refs.linkStateSelect.value=state.linkState;refs.gatewayAdapterSelect.value=state.gatewayAdapter;refs.resendWindowInput.value=String(state.resendWindowSec);refs.maxRetriesInput.value=String(state.maxRetries);renderLogs();renderMessages();renderCommitHistory();renderPeers();renderSignalTimeline();refreshStatus();updateMetrics();renderMovePacket();renderQueueBoard();drawSignalMap()}
function exportJson(){downloadBlob(JSON.stringify(buildExportPayload(),null,2),'fieldscope-export.json','application/json')}
function exportReport(){const d=computeDecision(),payload=buildExportPayload();const report=`FIELDSCOPE Field Report\n\nAssistive system only. Does not replace trained judgment.\n\nCALLSIGN: ${state.callsign||'unset'}\nROLE: ${state.role}\nMODE: ${state.mode}\nSUBJECT: ${state.subjectType}\nLKP: ${state.lkp||'not set'}\nELAPSED HOURS: ${state.elapsedHours}\nLINK STATE: ${state.linkState}\nGATEWAY MODE: ${state.gatewayMode?'on':'off'}\nGATEWAY ADAPTER: ${state.gatewayAdapter}\nQUEUED PACKETS: ${state.packetQueue.length}\nACKED PACKETS: ${state.ackedPackets.length}\nFAILED PACKETS: ${state.failedPackets.length}\n\nSIGNAL SUMMARY\n${d.signalSummary.map(x=>`- ${x}`).join('\\n')}\n\nPATTERN MATCH\n${d.patternMatch.map(x=>`- ${x}`).join('\\n')}\n\nNEXT MOVE\n${d.nextMove.map(x=>`- ${x}`).join('\\n')}\n\nRAW SNAPSHOT\n${JSON.stringify(payload,null,2)}\n`;downloadBlob(report,'fieldscope-report.txt','text/plain;charset=utf-8')}
function bandLabel(v){if(v<.3)return'LOW';if(v<.6)return'MODERATE';if(v<.8)return'STRONG';return'HIGH'}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function circularMean(angles){const xs=angles.map(a=>Math.cos(a*Math.PI/180)),ys=angles.map(a=>Math.sin(a*Math.PI/180)),x=xs.reduce((a,b)=>a+b,0)/angles.length,y=ys.reduce((a,b)=>a+b,0)/angles.length;return(Math.atan2(y,x)*180/Math.PI+360)%360}
function addSignalEvent(tag,text){state.signalEvents.unshift({time:new Date().toLocaleTimeString(),tag,text});renderSignalTimeline()}
function renderSignalTimeline(){refs.signalTimeline.innerHTML='';state.signalEvents.slice(0,18).forEach(item=>{const d=document.createElement('div');d.className='timeline-item';d.innerHTML=`<div class="timeline-item-head"><strong>${item.time}</strong><span class="tag">${item.tag}</span></div><div>${item.text}</div>`;refs.signalTimeline.appendChild(d)})}
function renderCommitHistory(){refs.commitHistory.innerHTML='';state.committedMoves.slice(0,12).forEach(item=>{const d=document.createElement('div');d.className='timeline-item';d.innerHTML=`<div class="timeline-item-head"><strong>${item.time}</strong><span class="tag">committed</span></div><div>${item.text}</div>`;refs.commitHistory.appendChild(d)})}
function commitMove(){const text=refs.chosenMove.value.trim();if(!text)return;state.committedMoves.unshift({time:new Date().toLocaleTimeString(),text});refs.chosenMove.value='';refs.commitState.textContent='move committed';addSignalEvent('commit',text);renderCommitHistory();queuePacket(buildPacket('move_commit',{text}));queuePeerState('commit');updateMetrics()}
function updateMetrics(){refs.metricScans.textContent=String(state.signalEvents.filter(x=>x.tag==='scan').length);refs.metricCaptures.textContent=String(state.signalEvents.filter(x=>x.tag==='visual').length);refs.metricLogs.textContent=String(state.logs.length);refs.metricCommits.textContent=String(state.committedMoves.length);refs.metricGps.textContent=String(state.gpsPoints.length);refs.metricMarkers.textContent=String(state.gpsMarkers.length);refs.metricPeers.textContent=String(state.peers.size+state.teamPackets.length);refs.metricQueued.textContent=String(state.packetQueue.length);refs.metricAcked.textContent=String(state.ackedPackets.length);refs.metricFailed.textContent=String(state.failedPackets.length)}
function clearMission(){if(state.gpsWatchId!=null)stopGps();Object.assign(state,{callsign:'',role:'field',mode:'sar',subjectType:'child',lkp:'',elapsedHours:2,notes:'',heading:null,linkState:'local_only',gatewayMode:false,gatewayAdapter:'none',resendWindowSec:20,maxRetries:4,packetQueue:[],sentPackets:[],ackedPackets:[],failedPackets:[],audio:null,audioScans:[],visual:null,gpsPoints:[],gpsMarkers:[],logs:[],signalEvents:[],committedMoves:[],messages:[],peers:new Map(),teamPackets:[],fusionPacket:null,fusionRuns:0,hotspotClusters:[],mapView:{zoom:1,panX:0,panY:0,dragging:false,lastX:0,lastY:0}});refs.callsign.value='';refs.roleSelect.value='field';refs.modeSelect.value='sar';refs.subjectType.value='child';refs.lkp.value='';refs.elapsedHours.value='2';refs.contextNotes.value='';refs.linkStateSelect.value='local_only';refs.gatewayAdapterSelect.value='none';refs.resendWindowInput.value='20';refs.maxRetriesInput.value='4';refs.chosenMove.value='';refs.messageInput.value='';refs.audioInterpretation.textContent='No scan yet.';refs.visualInterpretation.textContent='No visual capture yet.';refs.gpsReadout.textContent='GPS idle.';refs.sessionBox.textContent='No saved session loaded.';refs.teamPacketBox.textContent='No imported bundle loaded.';refs.audioMeter.style.width='0%';refs.statRms.textContent='--';refs.statHz.textContent='--';refs.statZcr.textContent='--';refs.statClass.textContent='--';refs.cameraTags.innerHTML='';refs.signalTimeline.innerHTML='';refs.commitHistory.innerHTML='';refs.replayTimeline.innerHTML='';refs.messageLane.innerHTML='';refs.visualBand.textContent='visual idle';refs.fusionState.textContent='awaiting scans';refs.clusterState.textContent='no clusters';refs.fusionBox.textContent='No fusion packet yet.';refs.queueBox.textContent='Queue empty.';refreshStatus();renderRoleLane();renderMovePacket();updateMetrics();renderMessages();renderPeers();renderQueueBoard();drawSignalMap()}
function downloadBlob(text,filename,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url)}
window.addEventListener('resize',drawSignalMap);init();

function renderMessages(){refs.messageLane.innerHTML='';state.messages.slice(0,20).forEach(m=>{const d=document.createElement('div');d.className='timeline-item';d.innerHTML=`<div class="timeline-item-head"><strong>${m.from}</strong><span class="tag">${m.role} • ${m.time}${m.pending?' • pending':''}</span></div><div>${m.text}</div>`;refs.messageLane.appendChild(d)})}
function renderPeers(){refs.unitBoard.innerHTML='';const self=buildPeerState();const units=[self,...state.peers.values()];units.forEach(u=>{const d=document.createElement('div');d.className='timeline-item';d.innerHTML=`<div class="timeline-item-head"><strong>${u.callsign||'Unnamed'}</strong><span class="tag">${u.role||'field'}</span></div><div>Mode: ${u.mode||'-'}<br>${u.gpsPoint?`GPS: ${u.gpsPoint.lat.toFixed(5)}, ${u.gpsPoint.lon.toFixed(5)}`:'GPS: none'}<br>${u.audio?`Audio: ${Math.round((u.audio.confidence||0)*100)}% ${u.audio.label||''}`:'Audio: none'}<br>${u.commit?`Commit: ${u.commit.text}`:'Commit: none'}</div>`;refs.unitBoard.appendChild(d)});const top=state.hotspotClusters[0];refs.commandSummary.innerHTML=`Visible units: <strong>${units.length}</strong><br>Queue depth: <strong>${state.packetQueue.length}</strong><br>ACKed: <strong>${state.ackedPackets.length}</strong><br>Failed: <strong>${state.failedPackets.length}</strong><br>Link state: <strong>${LINKS[state.linkState]}</strong><br>Top hotspot: <strong>${top?`${top.label} (${top.score.toFixed(2)})`:'none'}</strong>`}
function buildPeerState(){return{callsign:state.callsign||'Unnamed',role:state.role,mode:state.mode,gpsPoint:state.gpsPoints[state.gpsPoints.length-1]||null,audio:state.audio?{confidence:state.audio.classification?.confidence||0,label:state.audio.classification?.label||'',heading:state.audio.heading}:null,commit:state.committedMoves[0]||null}}
function queuePeerState(reason='update'){queuePacket(buildPacket('peer_state',{reason,...buildPeerState()}))}

function applyPacketLocally(packet){if(packet.type==='short_message'){state.messages=state.messages.map(m=>m.packet_id===packet.id?{...m,pending:true}:m)}else if(packet.type==='peer_state'){state.peers.set(packet.operator_id,packet.payload)}}


/* ===== v1.1 ENVIRONMENT LAYER ===== */
state.environment = {
  source: 'none',
  updatedAt: null,
  tempF: null,
  windMph: null,
  precip: 'none',
  light: 'day',
  summary: 'No snapshot'
};

const envRefs = {
  fetchWeatherBtn: document.getElementById('fetchWeatherBtn'),
  applyManualEnvBtn: document.getElementById('applyManualEnvBtn'),
  manualTempInput: document.getElementById('manualTempInput'),
  manualWindInput: document.getElementById('manualWindInput'),
  manualPrecipSelect: document.getElementById('manualPrecipSelect'),
  manualLightSelect: document.getElementById('manualLightSelect'),
  environmentBox: document.getElementById('environmentBox'),
  conditionFlagsBox: document.getElementById('conditionFlagsBox'),
  exposureClockBox: document.getElementById('exposureClockBox')
};

function initEnvironmentLayer(){
  if(envRefs.fetchWeatherBtn) envRefs.fetchWeatherBtn.onclick = fetchEnvironmentWeather;
  if(envRefs.applyManualEnvBtn) envRefs.applyManualEnvBtn.onclick = applyManualEnvironment;
  renderEnvironmentLayer();
}

async function fetchEnvironmentWeather(){
  if(!navigator.geolocation){
    envRefs.environmentBox.textContent = 'Geolocation unavailable. Use manual environment inputs.';
    return;
  }
  envRefs.environmentBox.textContent = 'Fetching local weather snapshot...';
  navigator.geolocation.getCurrentPosition(async (pos) => {
    try {
      const lat = pos.coords.latitude.toFixed(4);
      const lon = pos.coords.longitude.toFixed(4);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,wind_speed_10m,is_day&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
      const res = await fetch(url);
      if(!res.ok) throw new Error('weather request failed');
      const data = await res.json();
      const c = data.current || {};
      state.environment = {
        source: 'live',
        updatedAt: new Date().toISOString(),
        tempF: Number(c.temperature_2m ?? envRefs.manualTempInput.value),
        windMph: Number(c.wind_speed_10m ?? envRefs.manualWindInput.value),
        precip: classifyPrecip(c.precipitation ?? 0),
        light: Number(c.is_day) === 1 ? 'day' : 'night',
        summary: `${Math.round(Number(c.temperature_2m ?? 0))}°F | Wind ${Math.round(Number(c.wind_speed_10m ?? 0))} mph | ${classifyPrecip(c.precipitation ?? 0)}`
      };
      syncEnvironmentInputsFromState();
      renderEnvironmentLayer();
    } catch(err){
      envRefs.environmentBox.textContent = `Live weather failed: ${err.message}. Use manual environment inputs.`;
    }
  }, (err) => {
    envRefs.environmentBox.textContent = `Location failed: ${err.message}. Use manual environment inputs.`;
  }, {enableHighAccuracy:true, timeout:10000});
}

function classifyPrecip(v){
  const n = Number(v || 0);
  if(n >= 0.15) return 'heavy';
  if(n > 0.0) return 'light';
  return 'none';
}

function applyManualEnvironment(){
  state.environment = {
    source: 'manual',
    updatedAt: new Date().toISOString(),
    tempF: Number(envRefs.manualTempInput.value || 58),
    windMph: Number(envRefs.manualWindInput.value || 0),
    precip: envRefs.manualPrecipSelect.value,
    light: envRefs.manualLightSelect.value,
    summary: `${Math.round(Number(envRefs.manualTempInput.value || 0))}°F | Wind ${Math.round(Number(envRefs.manualWindInput.value || 0))} mph | ${envRefs.manualPrecipSelect.value}`
  };
  renderEnvironmentLayer();
}

function syncEnvironmentInputsFromState(){
  envRefs.manualTempInput.value = String(state.environment.tempF ?? 58);
  envRefs.manualWindInput.value = String(state.environment.windMph ?? 8);
  envRefs.manualPrecipSelect.value = state.environment.precip || 'none';
  envRefs.manualLightSelect.value = state.environment.light || 'day';
}

function computeConditionFlags(){
  const e = state.environment || {};
  const flags = [];
  const temp = Number(e.tempF ?? 60);
  const wind = Number(e.windMph ?? 0);
  const precip = e.precip || 'none';
  const light = e.light || 'day';

  if(temp <= 40) flags.push({label:'Cold Risk: High', level:'high'});
  else if(temp <= 55) flags.push({label:'Cold Risk: Moderate', level:'mid'});
  else if(temp >= 95) flags.push({label:'Heat Stress: High', level:'high'});
  else if(temp >= 85) flags.push({label:'Heat Stress: Moderate', level:'mid'});

  if(wind >= 20) flags.push({label:'Wind Exposure: High', level:'high'});
  else if(wind >= 10) flags.push({label:'Wind Exposure: Moderate', level:'mid'});

  if(precip === 'heavy' || precip === 'snow') flags.push({label:'Wet Exposure: High', level:'high'});
  else if(precip === 'light') flags.push({label:'Wet Exposure: Rising', level:'mid'});

  if(light === 'night') flags.push({label:'Night Penalty: Active', level:'high'});
  else if(light === 'dusk') flags.push({label:'Night Penalty: Approaching', level:'mid'});

  if(!flags.length) flags.push({label:'Environmental Risk: Low', level:'low'});
  return flags;
}

function computeExposureClock(){
  const elapsed = Number(state.elapsedHours || 0);
  const e = state.environment || {};
  const temp = Number(e.tempF ?? 60);
  const wind = Number(e.windMph ?? 0);
  const precip = e.precip || 'none';
  const light = e.light || 'day';
  let score = elapsed * 0.65;

  if(state.subjectType === 'child') score += 1.2;
  else if(state.subjectType === 'elderly') score += 1.15;
  else if(state.subjectType === 'injured_adult') score += 1.45;
  else if(state.subjectType === 'unknown') score += 0.6;

  if(temp <= 32) score += 2.4;
  else if(temp <= 45) score += 1.6;
  else if(temp <= 55) score += 0.8;
  else if(temp >= 100) score += 2.1;
  else if(temp >= 90) score += 1.2;
  else if(temp >= 82) score += 0.6;

  if(wind >= 25) score += 1.0;
  else if(wind >= 12) score += 0.5;

  if(precip === 'light') score += 0.7;
  else if(precip === 'heavy') score += 1.4;
  else if(precip === 'snow') score += 1.8;

  if(light === 'dusk') score += 0.5;
  else if(light === 'night') score += 1.1;

  let severity = 0;
  if(score >= 7.2) severity = 5;
  else if(score >= 5.8) severity = 4;
  else if(score >= 4.3) severity = 3;
  else if(score >= 2.8) severity = 2;
  else if(score >= 1.4) severity = 1;

  const labels = ['Stable','Watch','Elevated','Serious','Critical','Immediate'];
  const nextThresholds = [1.4,2.8,4.3,5.8,7.2];
  const next = nextThresholds.find(t => score < t);
  const delta = next == null ? null : (next - score);

  return {
    score,
    severity,
    label: labels[severity],
    timeToNextHours: delta == null ? null : Math.max(0, delta / 0.65)
  };
}

function renderEnvironmentLayer(){
  const e = state.environment || {};
  const flags = computeConditionFlags();
  const exposure = computeExposureClock();
  const updated = e.updatedAt ? new Date(e.updatedAt).toLocaleTimeString() : 'not set';

  envRefs.environmentBox.innerHTML =
    `<strong>ENVIRONMENT</strong><br>` +
    `${e.summary || 'No weather snapshot yet.'}<br>` +
    `Source: <strong>${e.source || 'none'}</strong><br>` +
    `Updated: <strong>${updated}</strong>`;

  envRefs.conditionFlagsBox.innerHTML =
    `<strong>CONDITIONS</strong><br><div class="flag-row">` +
    flags.map(f => `<span class="flag-pill flag-${f.level}">${f.label}</span>`).join('') +
    `</div>`;

  const cls = exposure.severity >= 4 ? 'exposure-critical' :
              exposure.severity >= 3 ? 'exposure-high' :
              exposure.severity >= 2 ? 'exposure-moderate' : 'exposure-low';

  envRefs.exposureClockBox.className = `result-card small ${cls}`;
  envRefs.exposureClockBox.innerHTML =
    `<strong>EXPOSURE CLOCK</strong><br>` +
    `Elapsed since last contact: <strong>${Number(state.elapsedHours || 0).toFixed(2)}h</strong><br>` +
    `Severity: <strong>${exposure.severity} / 5 · ${exposure.label}</strong><br>` +
    `Pressure score: <strong>${exposure.score.toFixed(2)}</strong><br>` +
    `${exposure.timeToNextHours == null ? 'Top threshold reached.' : `Next threshold in ~<strong>${exposure.timeToNextHours.toFixed(1)}h</strong> if conditions hold.`}`;
}

const __oldRenderMovePacket_env = renderMovePacket;
renderMovePacket = function(){
  __oldRenderMovePacket_env();
  try{
    const exposure = computeExposureClock();
    refs.moveOutput.innerHTML += `<br><br><strong>ENVIRONMENT / EXPOSURE</strong><br>` +
      `Weather source: ${state.environment.source || 'none'}<br>` +
      `Exposure severity: ${exposure.severity}/5 · ${exposure.label}`;
  }catch(err){}
};

const __oldRefreshStatus_env = refreshStatus;
refreshStatus = function(){
  __oldRefreshStatus_env();
  if(state.environment && state.environment.summary){
    refs.gatewayBox.innerHTML += `<br>Environment: <strong>${state.environment.summary}</strong>`;
  }
};

const __oldBuildExportPayload_env = buildExportPayload;
buildExportPayload = function(){
  const payload = __oldBuildExportPayload_env();
  payload.environment = state.environment;
  payload.conditionFlags = computeConditionFlags();
  payload.exposureClock = computeExposureClock();
  return payload;
};

const __oldHydrate_env = hydrateFromPayload;
hydrateFromPayload = function(data){
  __oldHydrate_env(data);
  if(data.environment){
    state.environment = data.environment;
    syncEnvironmentInputsFromState();
  }
  renderEnvironmentLayer();
};

const __oldClearMission_env = clearMission;
clearMission = function(){
  __oldClearMission_env();
  state.environment = {source:'none',updatedAt:null,tempF:null,windMph:null,precip:'none',light:'day',summary:'No snapshot'};
  syncEnvironmentInputsFromState();
  renderEnvironmentLayer();
};

initEnvironmentLayer();
renderEnvironmentLayer();
refreshStatus();


/* ===== v1.2 AGENCY COORDINATION LANE ===== */
PRIORITY.agency_coordination = 3;

state.agencyCoordination = {
  lastPacket: null
};

const agencyRefs = {
  agencyNameInput: document.getElementById('agencyNameInput'),
  agencyContactInput: document.getElementById('agencyContactInput'),
  agencyMessageTypeSelect: document.getElementById('agencyMessageTypeSelect'),
  agencyUrgencySelect: document.getElementById('agencyUrgencySelect'),
  agencyRequestInput: document.getElementById('agencyRequestInput'),
  generateAgencyBtn: document.getElementById('generateAgencyBtn'),
  queueAgencyBtn: document.getElementById('queueAgencyBtn'),
  exportAgencyBtn: document.getElementById('exportAgencyBtn'),
  agencyPreviewBox: document.getElementById('agencyPreviewBox')
};

function initAgencyCoordinationLane(){
  if(agencyRefs.generateAgencyBtn) agencyRefs.generateAgencyBtn.onclick = generateAgencyPacket;
  if(agencyRefs.queueAgencyBtn) agencyRefs.queueAgencyBtn.onclick = queueAgencyPacket;
  if(agencyRefs.exportAgencyBtn) agencyRefs.exportAgencyBtn.onclick = exportAgencyPacketText;
  renderAgencyPreview();
}

function collectAgencyPacket(){
  const agency = (agencyRefs.agencyNameInput?.value || '').trim();
  const contact = (agencyRefs.agencyContactInput?.value || '').trim();
  const messageType = agencyRefs.agencyMessageTypeSelect?.value || 'request_assistance';
  const urgency = agencyRefs.agencyUrgencySelect?.value || 'routine';
  const requestText = (agencyRefs.agencyRequestInput?.value || '').trim();
  const env = state.environment || {};
  const exposure = typeof computeExposureClock === 'function' ? computeExposureClock() : null;
  const decision = typeof computeDecision === 'function' ? computeDecision() : null;

  const packet = {
    agency,
    contact,
    messageType,
    urgency,
    requestText,
    generatedAt: new Date().toISOString(),
    fromCallsign: state.callsign || 'Unnamed',
    role: state.role,
    mode: state.mode,
    subjectType: state.subjectType,
    lkp: state.lkp || '',
    elapsedHours: Number(state.elapsedHours || 0),
    notes: state.notes || '',
    gpsPoint: state.gpsPoints[state.gpsPoints.length - 1] || null,
    weatherSummary: env.summary || 'No weather snapshot',
    weatherSource: env.source || 'none',
    exposureSeverity: exposure ? exposure.severity : null,
    exposureLabel: exposure ? exposure.label : null,
    lastCommit: state.committedMoves[0]?.text || 'none',
    topHotspot: state.hotspotClusters[0] ? {
      label: state.hotspotClusters[0].label,
      score: Number(state.hotspotClusters[0].score.toFixed(2))
    } : null,
    queueDepth: state.packetQueue.length,
    moveGuidance: decision ? decision.nextMove.slice(0,3) : []
  };
  return packet;
}

function packetTypeLabel(v){
  const labels = {
    request_assistance: 'Request Assistance',
    request_cooperation: 'Request Cooperation',
    send_update: 'Send Update',
    resource_need: 'Resource Need'
  };
  return labels[v] || v;
}

function generateAgencyPreviewText(packet){
  const gps = packet.gpsPoint ? `${packet.gpsPoint.lat.toFixed(5)}, ${packet.gpsPoint.lon.toFixed(5)}` : 'No current GPS point';
  const hotspot = packet.topHotspot ? `${packet.topHotspot.label} (${packet.topHotspot.score})` : 'none';
  return `
<strong>${packetTypeLabel(packet.messageType)}</strong><br>
Agency: <strong>${packet.agency || 'not set'}</strong><br>
Contact: <strong>${packet.contact || 'not set'}</strong><br>
Urgency: <strong>${packet.urgency}</strong><br>
From: <strong>${packet.fromCallsign}</strong> (${packet.role})<br>
Subject: <strong>${packet.subjectType}</strong><br>
LKP: <strong>${packet.lkp || 'not set'}</strong><br>
Elapsed: <strong>${packet.elapsedHours.toFixed(2)}h</strong><br>
Location: <strong>${gps}</strong><br>
Environment: <strong>${packet.weatherSummary}</strong><br>
Exposure: <strong>${packet.exposureSeverity == null ? 'n/a' : `${packet.exposureSeverity}/5 · ${packet.exposureLabel}`}</strong><br>
Top hotspot: <strong>${hotspot}</strong><br>
Last commit: <strong>${packet.lastCommit}</strong><br>
Request: <strong>${packet.requestText || 'not set'}</strong><br>
Suggested next moves: <strong>${packet.moveGuidance.length ? packet.moveGuidance.join(' | ') : 'none'}</strong>
`.trim();
}

function renderAgencyPreview(){
  const packet = state.agencyCoordination.lastPacket;
  if(!agencyRefs.agencyPreviewBox) return;
  if(!packet){
    agencyRefs.agencyPreviewBox.textContent = 'No agency coordination packet generated yet.';
    return;
  }
  agencyRefs.agencyPreviewBox.innerHTML = generateAgencyPreviewText(packet);
}

function generateAgencyPacket(){
  state.agencyCoordination.lastPacket = collectAgencyPacket();
  renderAgencyPreview();
}

function queueAgencyPacket(){
  if(!state.agencyCoordination.lastPacket){
    state.agencyCoordination.lastPacket = collectAgencyPacket();
  }
  const p = state.agencyCoordination.lastPacket;
  queuePacket(buildPacket('agency_coordination', p));
  renderAgencyPreview();
}

function exportAgencyPacketText(){
  if(!state.agencyCoordination.lastPacket){
    state.agencyCoordination.lastPacket = collectAgencyPacket();
  }
  const p = state.agencyCoordination.lastPacket;
  const gps = p.gpsPoint ? `${p.gpsPoint.lat.toFixed(5)}, ${p.gpsPoint.lon.toFixed(5)}` : 'No current GPS point';
  const hotspot = p.topHotspot ? `${p.topHotspot.label} (${p.topHotspot.score})` : 'none';
  const text = `FIELDSCOPE · AGENCY COORDINATION PACKET

Message Type: ${packetTypeLabel(p.messageType)}
Agency: ${p.agency || 'not set'}
Contact Channel: ${p.contact || 'not set'}
Urgency: ${p.urgency}
Generated: ${p.generatedAt}

From Callsign: ${p.fromCallsign}
Role: ${p.role}
Mode: ${p.mode}
Subject Type: ${p.subjectType}
Last Known Point: ${p.lkp || 'not set'}
Elapsed Since Contact: ${p.elapsedHours.toFixed(2)}h
Current GPS: ${gps}

Environment: ${p.weatherSummary}
Weather Source: ${p.weatherSource}
Exposure Severity: ${p.exposureSeverity == null ? 'n/a' : `${p.exposureSeverity}/5 · ${p.exposureLabel}`}

Top Hotspot: ${hotspot}
Last Commit: ${p.lastCommit}
Queue Depth: ${p.queueDepth}

Requested Help / Cooperation:
${p.requestText || 'not set'}

Suggested Next Moves:
${p.moveGuidance.length ? p.moveGuidance.map(x=>'- '+x).join('\n') : '- none'}
`;
  downloadBlob(text, 'fieldscope-agency-coordination-packet.txt', 'text/plain;charset=utf-8');
}

const __oldBuildExportPayload_agency = buildExportPayload;
buildExportPayload = function(){
  const payload = __oldBuildExportPayload_agency();
  payload.agencyCoordination = state.agencyCoordination;
  return payload;
};

const __oldHydrate_agency = hydrateFromPayload;
hydrateFromPayload = function(data){
  __oldHydrate_agency(data);
  if(data.agencyCoordination){
    state.agencyCoordination = data.agencyCoordination;
  }
  renderAgencyPreview();
};

const __oldClearMission_agency = clearMission;
clearMission = function(){
  __oldClearMission_agency();
  state.agencyCoordination = { lastPacket: null };
  if(agencyRefs.agencyNameInput) agencyRefs.agencyNameInput.value = '';
  if(agencyRefs.agencyContactInput) agencyRefs.agencyContactInput.value = '';
  if(agencyRefs.agencyMessageTypeSelect) agencyRefs.agencyMessageTypeSelect.value = 'request_assistance';
  if(agencyRefs.agencyUrgencySelect) agencyRefs.agencyUrgencySelect.value = 'routine';
  if(agencyRefs.agencyRequestInput) agencyRefs.agencyRequestInput.value = '';
  renderAgencyPreview();
};

initAgencyCoordinationLane();
renderAgencyPreview();


/* ===== v1.3 SECTOR DISCIPLINE + TRUTH HIERARCHY ===== */
state.sectors = [];
state.truthHierarchy = [];

const sectorRefs = {
  sectorIdInput: document.getElementById('sectorIdInput'),
  sectorStatusSelect: document.getElementById('sectorStatusSelect'),
  sectorAssignedInput: document.getElementById('sectorAssignedInput'),
  sectorPrioritySelect: document.getElementById('sectorPrioritySelect'),
  sectorNoteInput: document.getElementById('sectorNoteInput'),
  addSectorBtn: document.getElementById('addSectorBtn'),
  clearSectorsBtn: document.getElementById('clearSectorsBtn'),
  sectorBoard: document.getElementById('sectorBoard'),
  truthBox: document.getElementById('truthBox'),
  truthBoard: document.getElementById('truthBoard')
};

function initSectorTruthLayer(){
  if(sectorRefs.addSectorBtn) sectorRefs.addSectorBtn.onclick = addOrUpdateSector;
  if(sectorRefs.clearSectorsBtn) sectorRefs.clearSectorsBtn.onclick = clearSectors;
  renderSectorBoard();
  renderTruthHierarchy();
}

function addOrUpdateSector(){
  const sectorId = (sectorRefs.sectorIdInput?.value || '').trim();
  if(!sectorId) return;
  const status = sectorRefs.sectorStatusSelect?.value || 'assigned';
  const assignedTo = (sectorRefs.sectorAssignedInput?.value || '').trim() || 'Unassigned';
  const priority = sectorRefs.sectorPrioritySelect?.value || 'routine';
  const note = (sectorRefs.sectorNoteInput?.value || '').trim();
  const existing = state.sectors.findIndex(s => s.id.toLowerCase() === sectorId.toLowerCase());
  const sector = {
    id: sectorId,
    status,
    assignedTo,
    priority,
    note,
    updatedAt: new Date().toISOString(),
    updatedBy: state.callsign || 'Unnamed'
  };
  if(existing >= 0) state.sectors[existing] = sector;
  else state.sectors.unshift(sector);
  renderSectorBoard();
  renderTruthHierarchy();
  queuePacket(buildPacket('peer_state', {reason:'sector_update', sectors:state.sectors.slice(0,12), ...buildPeerState()}));
}

function clearSectors(){
  state.sectors = [];
  renderSectorBoard();
  renderTruthHierarchy();
}

function renderSectorBoard(){
  if(!sectorRefs.sectorBoard) return;
  sectorRefs.sectorBoard.innerHTML = '';
  if(!state.sectors.length){
    sectorRefs.sectorBoard.innerHTML = '<div class="timeline-item">No sectors assigned yet.</div>';
    return;
  }
  state.sectors.slice(0,20).forEach(s => {
    const d = document.createElement('div');
    d.className = `timeline-item status-${s.status}`;
    d.innerHTML = `<div class="timeline-item-head"><strong>${s.id}</strong><span class="tag">${s.status} • ${s.priority}</span></div>
      <div>Assigned: ${s.assignedTo}<br>By: ${s.updatedBy}<br>${s.note || 'No note'}<br>Updated: ${new Date(s.updatedAt).toLocaleTimeString()}</div>`;
    sectorRefs.sectorBoard.appendChild(d);
  });
}

function ageSeconds(ts){
  try{
    return Math.max(0, Math.floor((Date.now() - new Date(ts).getTime())/1000));
  }catch(err){
    return 999;
  }
}

function makeTruthItem(label, baseScore, ageSec, type, detail){
  const agePenalty = ageSec >= 300 ? 1.8 : ageSec >= 120 ? 1.0 : ageSec >= 45 ? 0.45 : 0;
  const score = Math.max(0, baseScore - agePenalty);
  return {label, score, ageSec, type, detail};
}

function computeTruthHierarchy(){
  const items = [];

  if(state.gpsPoints.length){
    const ageSec = ageSeconds(state.gpsPoints[state.gpsPoints.length-1].ts);
    items.push(makeTruthItem('Current GPS point', 5.0, ageSec, 'live_gps', 'Latest operator location'));
  }

  if(state.environment?.updatedAt){
    const ageSec = ageSeconds(state.environment.updatedAt);
    items.push(makeTruthItem('Environment snapshot', 3.2, ageSec, 'environment', state.environment.summary || 'Weather snapshot'));
  }

  if(state.audioScans.length){
    const s = state.audioScans[state.audioScans.length-1];
    const conf = Number(s.classification?.confidence || 0);
    const ageSec = ageSeconds(s.capturedAt);
    items.push(makeTruthItem('Latest audio scan', 2.2 + conf*2.1, ageSec, 'audio_scan', s.classification?.label || 'Audio signal'));
  }

  if(state.visual?.capturedAt){
    const ageSec = ageSeconds(state.visual.capturedAt);
    items.push(makeTruthItem('Latest visual capture', 2.3, ageSec, 'visual', state.visual.read || 'Visual capture'));
  }

  if(state.hotspotClusters.length){
    const c = state.hotspotClusters[0];
    items.push(makeTruthItem('Top hotspot cluster', 1.8 + Math.min(2.4, Number(c.score || 0)), 25, 'cluster', `${c.label} (${Number(c.score || 0).toFixed(2)})`));
  }

  if(state.messages.length){
    const msg = state.messages[0];
    const pseudoAge = msg.time ? 60 : 120;
    items.push(makeTruthItem('Latest team message', 1.8, pseudoAge, 'message', msg.text || 'Message'));
  }

  if(state.committedMoves.length){
    const pseudoAge = 45;
    items.push(makeTruthItem('Last committed move', 2.7, pseudoAge, 'commit', state.committedMoves[0].text || 'Move commit'));
  }

  if(state.gpsMarkers.length){
    const m = state.gpsMarkers[state.gpsMarkers.length-1];
    const ageSec = ageSeconds(m.ts || new Date().toISOString());
    items.push(makeTruthItem('Latest marker', 2.4, ageSec, 'marker', m.label || 'Marker'));
  }

  if(state.sectors.length){
    const s = state.sectors[0];
    const ageSec = ageSeconds(s.updatedAt);
    items.push(makeTruthItem('Latest sector update', 2.9, ageSec, 'sector', `${s.id} • ${s.status}`));
  }

  items.sort((a,b)=>b.score-a.score);
  state.truthHierarchy = items;
  return items;
}

function truthBand(score){
  if(score >= 4.2) return {label:'HIGH', cls:'truth-high'};
  if(score >= 2.4) return {label:'MODERATE', cls:'truth-mid'};
  return {label:'LOW', cls:'truth-low'};
}

function computeSectorDisciplineIssues(){
  const issues = [];
  const active = state.sectors.filter(s => s.status === 'active');
  const assigned = state.sectors.filter(s => s.status === 'assigned');
  const cleared = state.sectors.filter(s => s.status === 'cleared');

  const seen = new Set();
  state.sectors.forEach(s => {
    const key = s.id.toLowerCase();
    if(seen.has(key)) issues.push(`Duplicate sector entry detected: <strong>${s.id}</strong>`);
    seen.add(key);
  });

  const assignedTeams = {};
  active.forEach(s => {
    const key = s.assignedTo.toLowerCase();
    assignedTeams[key] = (assignedTeams[key] || 0) + 1;
  });
  Object.entries(assignedTeams).forEach(([team,count]) => {
    if(count > 1) issues.push(`Overlap risk: <strong>${team}</strong> active in ${count} sectors`);
  });

  if(!active.length && assigned.length) issues.push('Assigned sectors exist but none are marked active.');
  if(cleared.length && active.length) issues.push('Cleared and active sectors coexist · verify boundary discipline.');

  return issues;
}

function renderTruthHierarchy(){
  const items = computeTruthHierarchy();
  if(!sectorRefs.truthBox || !sectorRefs.truthBoard) return;
  const top = items[0];
  const sectorIssues = computeSectorDisciplineIssues();
  sectorRefs.truthBox.innerHTML =
    `<strong>TRUTH HIERARCHY</strong><br>` +
    `${top ? `Top source: <strong>${top.label}</strong> • <span class="truth-score ${truthBand(top.score).cls}">${truthBand(top.score).label} (${top.score.toFixed(2)})</span><br>${top.detail}` : 'No evidence sources yet.'}` +
    `<br><br><strong>SECTOR DISCIPLINE</strong><br>` +
    `${sectorIssues.length ? sectorIssues.join('<br>') : 'No sector conflicts detected.'}`;

  sectorRefs.truthBoard.innerHTML = '';
  if(!items.length){
    sectorRefs.truthBoard.innerHTML = '<div class="timeline-item">No truth sources yet.</div>';
    return;
  }
  items.slice(0,12).forEach(item => {
    const band = truthBand(item.score);
    const d = document.createElement('div');
    d.className = 'timeline-item';
    d.innerHTML = `<div class="timeline-item-head"><strong>${item.label}</strong><span class="tag ${band.cls}">${band.label} • ${item.score.toFixed(2)}</span></div>
      <div>${item.detail}<br>Age: ${item.ageSec}s</div>`;
    sectorRefs.truthBoard.appendChild(d);
  });
}

const __oldRenderPeers_truth = renderPeers;
renderPeers = function(){
  __oldRenderPeers_truth();
  try{ renderTruthHierarchy(); }catch(err){}
};

const __oldBuildExportPayload_truth = buildExportPayload;
buildExportPayload = function(){
  const payload = __oldBuildExportPayload_truth();
  payload.sectors = state.sectors;
  payload.truthHierarchy = state.truthHierarchy;
  payload.sectorIssues = computeSectorDisciplineIssues();
  return payload;
};

const __oldHydrate_truth = hydrateFromPayload;
hydrateFromPayload = function(data){
  __oldHydrate_truth(data);
  if(Array.isArray(data.sectors)) state.sectors = data.sectors;
  if(Array.isArray(data.truthHierarchy)) state.truthHierarchy = data.truthHierarchy;
  renderSectorBoard();
  renderTruthHierarchy();
};

const __oldClearMission_truth = clearMission;
clearMission = function(){
  __oldClearMission_truth();
  state.sectors = [];
  state.truthHierarchy = [];
  if(sectorRefs.sectorIdInput) sectorRefs.sectorIdInput.value = '';
  if(sectorRefs.sectorStatusSelect) sectorRefs.sectorStatusSelect.value = 'assigned';
  if(sectorRefs.sectorAssignedInput) sectorRefs.sectorAssignedInput.value = '';
  if(sectorRefs.sectorPrioritySelect) sectorRefs.sectorPrioritySelect.value = 'routine';
  if(sectorRefs.sectorNoteInput) sectorRefs.sectorNoteInput.value = '';
  renderSectorBoard();
  renderTruthHierarchy();
};

const __oldExportReport_truth = exportReport;
exportReport = function(){
  try{ renderTruthHierarchy(); }catch(err){}
  __oldExportReport_truth();
};

initSectorTruthLayer();
renderSectorBoard();
renderTruthHierarchy();


/* ===== v1.4 PHONE RADIO GATEWAY LAYER ===== */
state.radioGateway = {
  adapterId: '',
  route: 'local_only',
  transport: 'ble',
  radioProfile: 'generic_packet',
  status: 'disconnected',
  batteryPct: 82,
  radioPath: 'unavailable',
  queueDepth: 0,
  lastRemoteAckAt: null,
  contract: {
    connect: true,
    disconnect: true,
    send_packet: true,
    receive_packet: true,
    report_tx_state: true,
    report_battery: true,
    report_queue_depth: true,
    report_adapter_health: true
  }
};

const gatewayRefs = {
  gatewayRouteSelect: document.getElementById('gatewayRouteSelect'),
  gatewayTransportSelect: document.getElementById('gatewayTransportSelect'),
  adapterIdInput: document.getElementById('adapterIdInput'),
  radioProfileSelect: document.getElementById('radioProfileSelect'),
  adapterBatteryInput: document.getElementById('adapterBatteryInput'),
  radioPathSelect: document.getElementById('radioPathSelect'),
  connectAdapterBtn: document.getElementById('connectAdapterBtn'),
  disconnectAdapterBtn: document.getElementById('disconnectAdapterBtn'),
  applyGatewayConfigBtn: document.getElementById('applyGatewayConfigBtn'),
  gatewayStatusCard: document.getElementById('gatewayStatusCard'),
  adapterContractBox: document.getElementById('adapterContractBox')
};

function initPhoneRadioGatewayLayer(){
  if(gatewayRefs.connectAdapterBtn) gatewayRefs.connectAdapterBtn.onclick = connectRadioAdapter;
  if(gatewayRefs.disconnectAdapterBtn) gatewayRefs.disconnectAdapterBtn.onclick = disconnectRadioAdapter;
  if(gatewayRefs.applyGatewayConfigBtn) gatewayRefs.applyGatewayConfigBtn.onclick = applyGatewayConfig;
  renderGatewayLayer();
  patchQueueBoardWithTransportStates();
}

function applyGatewayConfig(){
  state.radioGateway.route = gatewayRefs.gatewayRouteSelect?.value || 'local_only';
  state.radioGateway.transport = gatewayRefs.gatewayTransportSelect?.value || 'ble';
  state.radioGateway.adapterId = (gatewayRefs.adapterIdInput?.value || '').trim();
  state.radioGateway.radioProfile = gatewayRefs.radioProfileSelect?.value || 'generic_packet';
  state.radioGateway.batteryPct = Number(gatewayRefs.adapterBatteryInput?.value || 82);
  state.radioGateway.radioPath = gatewayRefs.radioPathSelect?.value || 'unavailable';
  renderGatewayLayer();
}

function connectRadioAdapter(){
  applyGatewayConfig();
  state.radioGateway.status = 'connected';
  state.radioGateway.queueDepth = state.packetQueue.length;
  renderGatewayLayer();
}

function disconnectRadioAdapter(){
  state.radioGateway.status = 'disconnected';
  state.radioGateway.radioPath = 'unavailable';
  renderGatewayLayer();
}

function transportStateForPacket(packet){
  if(packet.ack_status === 'failed') return {label:'failed', cls:'transport-failed'};
  if(packet.ack_status === 'acked') return {label:'remote confirmed', cls:'transport-remote'};
  if(packet.ack_status === 'sent'){
    if(state.radioGateway.route === 'adapter_only') return {label:'adapter received', cls:'transport-adapter'};
    if(state.radioGateway.route === 'radio_net') return {label:'radio transmitted', cls:'transport-radio'};
    if(state.radioGateway.route === 'command_gateway') return {label:'gateway uplink', cls:'transport-remote'};
    return {label:'sent', cls:'transport-adapter'};
  }
  if(packet.ack_status === 'queued'){
    if(state.radioGateway.route === 'local_only') return {label:'local only', cls:'transport-local'};
    return {label:'queued for transport', cls:'transport-local'};
  }
  return {label:'unknown', cls:'transport-local'};
}

function renderGatewayLayer(){
  if(!gatewayRefs.gatewayStatusCard || !gatewayRefs.adapterContractBox) return;
  state.radioGateway.queueDepth = state.packetQueue.length;
  const status = state.radioGateway.status || 'disconnected';
  gatewayRefs.gatewayStatusCard.innerHTML =
    `<strong>ADAPTER STATUS</strong><br>` +
    `Status: <strong>${status}</strong><br>` +
    `Adapter ID: <strong>${state.radioGateway.adapterId || 'not set'}</strong><br>` +
    `Route: <strong>${state.radioGateway.route.replaceAll('_',' ')}</strong><br>` +
    `Transport: <strong>${state.radioGateway.transport}</strong><br>` +
    `Radio profile: <strong>${state.radioGateway.radioProfile}</strong><br>` +
    `Battery: <strong>${state.radioGateway.batteryPct}%</strong><br>` +
    `Radio path: <strong>${state.radioGateway.radioPath}</strong><br>` +
    `Queue depth: <strong>${state.radioGateway.queueDepth}</strong><br>` +
    `Last remote ACK: <strong>${state.radioGateway.lastRemoteAckAt ? new Date(state.radioGateway.lastRemoteAckAt).toLocaleTimeString() : 'none'}</strong>`;

  const c = state.radioGateway.contract || {};
  gatewayRefs.adapterContractBox.innerHTML =
    `<strong>ADAPTER CONTRACT</strong><br>` +
    `connect: ${c.connect ? 'yes' : 'no'}<br>` +
    `disconnect: ${c.disconnect ? 'yes' : 'no'}<br>` +
    `send_packet: ${c.send_packet ? 'yes' : 'no'}<br>` +
    `receive_packet: ${c.receive_packet ? 'yes' : 'no'}<br>` +
    `report_tx_state: ${c.report_tx_state ? 'yes' : 'no'}<br>` +
    `report_battery: ${c.report_battery ? 'yes' : 'no'}<br>` +
    `report_queue_depth: ${c.report_queue_depth ? 'yes' : 'no'}<br>` +
    `report_adapter_health: ${c.report_adapter_health ? 'yes' : 'no'}`;
}

function patchQueueBoardWithTransportStates(){
  const __oldRenderQueueBoard_gateway = renderQueueBoard;
  renderQueueBoard = function(){
    __oldRenderQueueBoard_gateway();
    try{
      if(!refs.queueBoard) return;
      const items = refs.queueBoard.querySelectorAll('.timeline-item');
      items.forEach((node, idx) => {
        const packet = state.packetQueue[idx];
        if(!packet) return;
        const transport = transportStateForPacket(packet);
        node.classList.add(transport.cls);
        const badge = document.createElement('div');
        badge.className = `transport-badge ${transport.cls}`;
        badge.textContent = transport.label;
        const head = node.querySelector('.timeline-item-head');
        if(head) head.appendChild(badge);
      });
    }catch(err){}
  };
}

const __oldAckTopPacket_gateway = ackTopPacket;
ackTopPacket = function(){
  const before = state.ackedPackets.length;
  __oldAckTopPacket_gateway();
  if(state.ackedPackets.length > before){
    state.radioGateway.lastRemoteAckAt = new Date().toISOString();
    renderGatewayLayer();
  }
};

const __oldRefreshStatus_gateway = refreshStatus;
refreshStatus = function(){
  __oldRefreshStatus_gateway();
  try{ renderGatewayLayer(); }catch(err){}
};

const __oldBuildExportPayload_gateway = buildExportPayload;
buildExportPayload = function(){
  const payload = __oldBuildExportPayload_gateway();
  payload.radioGateway = state.radioGateway;
  payload.packetTransportStates = state.packetQueue.map(p => ({
    id: p.id,
    type: p.type,
    ack_status: p.ack_status,
    transport_state: transportStateForPacket(p).label
  }));
  return payload;
};

const __oldHydrate_gateway = hydrateFromPayload;
hydrateFromPayload = function(data){
  __oldHydrate_gateway(data);
  if(data.radioGateway) state.radioGateway = data.radioGateway;
  if(gatewayRefs.gatewayRouteSelect) gatewayRefs.gatewayRouteSelect.value = state.radioGateway.route || 'local_only';
  if(gatewayRefs.gatewayTransportSelect) gatewayRefs.gatewayTransportSelect.value = state.radioGateway.transport || 'ble';
  if(gatewayRefs.adapterIdInput) gatewayRefs.adapterIdInput.value = state.radioGateway.adapterId || '';
  if(gatewayRefs.radioProfileSelect) gatewayRefs.radioProfileSelect.value = state.radioGateway.radioProfile || 'generic_packet';
  if(gatewayRefs.adapterBatteryInput) gatewayRefs.adapterBatteryInput.value = String(state.radioGateway.batteryPct ?? 82);
  if(gatewayRefs.radioPathSelect) gatewayRefs.radioPathSelect.value = state.radioGateway.radioPath || 'unavailable';
  renderGatewayLayer();
  renderQueueBoard();
};

const __oldClearMission_gateway = clearMission;
clearMission = function(){
  __oldClearMission_gateway();
  state.radioGateway = {
    adapterId: '',
    route: 'local_only',
    transport: 'ble',
    radioProfile: 'generic_packet',
    status: 'disconnected',
    batteryPct: 82,
    radioPath: 'unavailable',
    queueDepth: 0,
    lastRemoteAckAt: null,
    contract: {
      connect: true,
      disconnect: true,
      send_packet: true,
      receive_packet: true,
      report_tx_state: true,
      report_battery: true,
      report_queue_depth: true,
      report_adapter_health: true
    }
  };
  if(gatewayRefs.gatewayRouteSelect) gatewayRefs.gatewayRouteSelect.value = 'local_only';
  if(gatewayRefs.gatewayTransportSelect) gatewayRefs.gatewayTransportSelect.value = 'ble';
  if(gatewayRefs.adapterIdInput) gatewayRefs.adapterIdInput.value = '';
  if(gatewayRefs.radioProfileSelect) gatewayRefs.radioProfileSelect.value = 'generic_packet';
  if(gatewayRefs.adapterBatteryInput) gatewayRefs.adapterBatteryInput.value = '82';
  if(gatewayRefs.radioPathSelect) gatewayRefs.radioPathSelect.value = 'unavailable';
  renderGatewayLayer();
};

initPhoneRadioGatewayLayer();
renderGatewayLayer();
renderQueueBoard();


/* ===== v1.5 ROUTE GOVERNOR + HANDSHAKE ===== */
state.routeGovernor = {
  defaultPolicy: 'auto',
  congestionMode: 'balanced',
  maxRadioPayload: 180,
  dropThreshold: 12
};

state.handshakeState = {
  phase: 'idle',
  phases: ['idle','pairing','adapter_link','capability_verified','route_verified','ready','degraded']
};

state.remoteAckMeta = {
  source: '',
  route: 'radio_net',
  lastSource: null,
  lastRoute: null,
  lastAt: null
};

const routeRefs = {
  defaultRoutePolicySelect: document.getElementById('defaultRoutePolicySelect'),
  congestionModeSelect: document.getElementById('congestionModeSelect'),
  maxRadioPayloadInput: document.getElementById('maxRadioPayloadInput'),
  dropThresholdInput: document.getElementById('dropThresholdInput'),
  routeGovernorBox: document.getElementById('routeGovernorBox'),
  handshakeAdvanceBtn: document.getElementById('handshakeAdvanceBtn'),
  handshakeResetBtn: document.getElementById('handshakeResetBtn'),
  handshakeBox: document.getElementById('handshakeBox'),
  ackSourceInput: document.getElementById('ackSourceInput'),
  ackRouteSelect: document.getElementById('ackRouteSelect'),
  ackSourceBox: document.getElementById('ackSourceBox')
};

function initRouteGovernorLayer(){
  if(routeRefs.defaultRoutePolicySelect) routeRefs.defaultRoutePolicySelect.onchange = applyRouteGovernorConfig;
  if(routeRefs.congestionModeSelect) routeRefs.congestionModeSelect.onchange = applyRouteGovernorConfig;
  if(routeRefs.maxRadioPayloadInput) routeRefs.maxRadioPayloadInput.oninput = applyRouteGovernorConfig;
  if(routeRefs.dropThresholdInput) routeRefs.dropThresholdInput.oninput = applyRouteGovernorConfig;
  if(routeRefs.handshakeAdvanceBtn) routeRefs.handshakeAdvanceBtn.onclick = advanceHandshake;
  if(routeRefs.handshakeResetBtn) routeRefs.handshakeResetBtn.onclick = resetHandshake;
  if(routeRefs.ackSourceInput) routeRefs.ackSourceInput.oninput = () => { state.remoteAckMeta.source = routeRefs.ackSourceInput.value || ''; renderAckSourceBox(); };
  if(routeRefs.ackRouteSelect) routeRefs.ackRouteSelect.onchange = () => { state.remoteAckMeta.route = routeRefs.ackRouteSelect.value || 'radio_net'; renderAckSourceBox(); };
  renderRouteGovernorBox();
  renderHandshakeBox();
  renderAckSourceBox();
  patchQueueBoardWithRouteGovernor();
}

function applyRouteGovernorConfig(){
  state.routeGovernor.defaultPolicy = routeRefs.defaultRoutePolicySelect?.value || 'auto';
  state.routeGovernor.congestionMode = routeRefs.congestionModeSelect?.value || 'balanced';
  state.routeGovernor.maxRadioPayload = Number(routeRefs.maxRadioPayloadInput?.value || 180);
  state.routeGovernor.dropThreshold = Number(routeRefs.dropThresholdInput?.value || 12);
  renderRouteGovernorBox();
  try{ renderQueueBoard(); }catch(err){}
}

function advanceHandshake(){
  const phases = state.handshakeState.phases;
  const idx = phases.indexOf(state.handshakeState.phase);
  state.handshakeState.phase = phases[Math.min(idx + 1, phases.length - 1)];
  renderHandshakeBox();
}

function resetHandshake(){
  state.handshakeState.phase = 'idle';
  renderHandshakeBox();
}

function handshakeBand(phase){
  if(phase === 'ready') return {cls:'handshake-good', label:'READY'};
  if(phase === 'degraded') return {cls:'handshake-bad', label:'DEGRADED'};
  if(['pairing','adapter_link','capability_verified','route_verified'].includes(phase)) return {cls:'handshake-warn', label:'IN PROGRESS'};
  return {cls:'handshake-warn', label:'IDLE'};
}

function renderHandshakeBox(){
  if(!routeRefs.handshakeBox) return;
  const phase = state.handshakeState.phase || 'idle';
  const band = handshakeBand(phase);
  routeRefs.handshakeBox.className = `result-card small ${band.cls}`;
  routeRefs.handshakeBox.innerHTML =
    `<strong>HANDSHAKE</strong><br>` +
    `Phase: <strong>${phase.replaceAll('_',' ')}</strong><br>` +
    `State: <strong>${band.label}</strong><br>` +
    `Expectation: <strong>${handshakeExpectation(phase)}</strong>`;
}

function handshakeExpectation(phase){
  const map = {
    idle: 'Adapter not yet staged.',
    pairing: 'Phone and adapter are pairing.',
    adapter_link: 'Transport link established.',
    capability_verified: 'Adapter contract validated.',
    route_verified: 'Route path verified for transport.',
    ready: 'Adapter ready for field use.',
    degraded: 'Adapter or path degraded · operator attention needed.'
  };
  return map[phase] || 'Unknown';
}

function packetPayloadEstimate(packet){
  try{
    return JSON.stringify(packet.payload || {}).length + String(packet.type || '').length + 48;
  }catch(err){
    return 999;
  }
}

function recommendedRouteForPacket(packet){
  if(packet.type === 'distress') return 'command_gateway';
  if(packet.type === 'move_commit') return 'radio_net';
  if(packet.type === 'agency_coordination') return 'command_gateway';
  if(packet.type === 'short_message') return 'radio_net';
  if(packet.type === 'peer_state') return 'adapter_only';
  return state.routeGovernor.defaultPolicy === 'auto' ? 'radio_net' : state.routeGovernor.defaultPolicy;
}

function fitBand(packet){
  const size = packetPayloadEstimate(packet);
  const maxSize = Number(state.routeGovernor.maxRadioPayload || 180);
  if(size <= maxSize * 0.7) return {label:`FIT ${size}B`, cls:'fit-good'};
  if(size <= maxSize) return {label:`TIGHT ${size}B`, cls:'fit-warn'};
  return {label:`OVERSIZE ${size}B`, cls:'fit-bad'};
}

function dropCandidate(packet){
  const depth = state.packetQueue.length;
  if(depth < Number(state.routeGovernor.dropThreshold || 12)) return false;
  if(state.routeGovernor.congestionMode === 'protect_high_priority'){
    return Number(packet.priority || 9) >= 6;
  }
  if(state.routeGovernor.congestionMode === 'strict_radio'){
    return Number(packet.priority || 9) >= 5 || packetPayloadEstimate(packet) > Number(state.routeGovernor.maxRadioPayload || 180);
  }
  return Number(packet.priority || 9) >= 8;
}

function renderRouteGovernorBox(){
  if(!routeRefs.routeGovernorBox) return;
  const oversize = state.packetQueue.filter(p => packetPayloadEstimate(p) > Number(state.routeGovernor.maxRadioPayload || 180)).length;
  const dropCount = state.packetQueue.filter(dropCandidate).length;
  routeRefs.routeGovernorBox.innerHTML =
    `<strong>ROUTE GOVERNOR</strong><br>` +
    `Default policy: <strong>${state.routeGovernor.defaultPolicy.replaceAll('_',' ')}</strong><br>` +
    `Congestion mode: <strong>${state.routeGovernor.congestionMode.replaceAll('_',' ')}</strong><br>` +
    `Max radio payload: <strong>${state.routeGovernor.maxRadioPayload} bytes</strong><br>` +
    `Drop threshold: <strong>${state.routeGovernor.dropThreshold}</strong><br>` +
    `Oversize packets: <strong>${oversize}</strong><br>` +
    `Current drop candidates: <strong>${dropCount}</strong>`;
}

function renderAckSourceBox(){
  if(!routeRefs.ackSourceBox) return;
  routeRefs.ackSourceBox.innerHTML =
    `<strong>REMOTE ACK SOURCE</strong><br>` +
    `Prepared source: <strong>${state.remoteAckMeta.source || 'not set'}</strong><br>` +
    `Prepared route: <strong>${(state.remoteAckMeta.route || 'radio_net').replaceAll('_',' ')}</strong><br>` +
    `Last source: <strong>${state.remoteAckMeta.lastSource || 'none'}</strong><br>` +
    `Last route: <strong>${state.remoteAckMeta.lastRoute ? state.remoteAckMeta.lastRoute.replaceAll('_',' ') : 'none'}</strong><br>` +
    `Last time: <strong>${state.remoteAckMeta.lastAt ? new Date(state.remoteAckMeta.lastAt).toLocaleTimeString() : 'none'}</strong>`;
}

function patchQueueBoardWithRouteGovernor(){
  const __oldRenderQueueBoard_route = renderQueueBoard;
  renderQueueBoard = function(){
    __oldRenderQueueBoard_route();
    try{
      if(!refs.queueBoard) return;
      const items = refs.queueBoard.querySelectorAll('.timeline-item');
      items.forEach((node, idx) => {
        const packet = state.packetQueue[idx];
        if(!packet) return;
        const policy = recommendedRouteForPacket(packet);
        const fit = fitBand(packet);
        const policyBadge = document.createElement('div');
        policyBadge.className = 'policy-badge';
        policyBadge.textContent = `route ${policy.replaceAll('_',' ')}`;
        const fitBadge = document.createElement('div');
        fitBadge.className = `fit-badge ${fit.cls}`;
        fitBadge.textContent = fit.label;
        const head = node.querySelector('.timeline-item-head');
        if(head){
          head.appendChild(policyBadge);
          head.appendChild(fitBadge);
        }
        if(dropCandidate(packet)){
          const drop = document.createElement('div');
          drop.className = 'drop-badge fit-bad';
          drop.textContent = 'drop candidate';
          if(head) head.appendChild(drop);
        }
      });
    }catch(err){}
  };
}

const __oldAckTopPacket_route = ackTopPacket;
ackTopPacket = function(){
  const before = state.ackedPackets.length;
  __oldAckTopPacket_route();
  if(state.ackedPackets.length > before){
    state.remoteAckMeta.lastSource = state.remoteAckMeta.source || 'unknown';
    state.remoteAckMeta.lastRoute = state.remoteAckMeta.route || 'radio_net';
    state.remoteAckMeta.lastAt = new Date().toISOString();
    renderAckSourceBox();
  }
};

const __oldBuildExportPayload_route = buildExportPayload;
buildExportPayload = function(){
  const payload = __oldBuildExportPayload_route();
  payload.routeGovernor = state.routeGovernor;
  payload.handshakeState = state.handshakeState;
  payload.remoteAckMeta = state.remoteAckMeta;
  payload.routeAdvisory = state.packetQueue.map(p => ({
    id: p.id,
    type: p.type,
    recommended_route: recommendedRouteForPacket(p),
    payload_estimate: packetPayloadEstimate(p),
    drop_candidate: dropCandidate(p)
  }));
  return payload;
};

const __oldHydrate_route = hydrateFromPayload;
hydrateFromPayload = function(data){
  __oldHydrate_route(data);
  if(data.routeGovernor) state.routeGovernor = data.routeGovernor;
  if(data.handshakeState) state.handshakeState = data.handshakeState;
  if(data.remoteAckMeta) state.remoteAckMeta = data.remoteAckMeta;
  if(routeRefs.defaultRoutePolicySelect) routeRefs.defaultRoutePolicySelect.value = state.routeGovernor.defaultPolicy || 'auto';
  if(routeRefs.congestionModeSelect) routeRefs.congestionModeSelect.value = state.routeGovernor.congestionMode || 'balanced';
  if(routeRefs.maxRadioPayloadInput) routeRefs.maxRadioPayloadInput.value = String(state.routeGovernor.maxRadioPayload ?? 180);
  if(routeRefs.dropThresholdInput) routeRefs.dropThresholdInput.value = String(state.routeGovernor.dropThreshold ?? 12);
  if(routeRefs.ackSourceInput) routeRefs.ackSourceInput.value = state.remoteAckMeta.source || '';
  if(routeRefs.ackRouteSelect) routeRefs.ackRouteSelect.value = state.remoteAckMeta.route || 'radio_net';
  renderRouteGovernorBox();
  renderHandshakeBox();
  renderAckSourceBox();
  renderQueueBoard();
};

const __oldClearMission_route = clearMission;
clearMission = function(){
  __oldClearMission_route();
  state.routeGovernor = {
    defaultPolicy: 'auto',
    congestionMode: 'balanced',
    maxRadioPayload: 180,
    dropThreshold: 12
  };
  state.handshakeState = {
    phase: 'idle',
    phases: ['idle','pairing','adapter_link','capability_verified','route_verified','ready','degraded']
  };
  state.remoteAckMeta = {
    source: '',
    route: 'radio_net',
    lastSource: null,
    lastRoute: null,
    lastAt: null
  };
  if(routeRefs.defaultRoutePolicySelect) routeRefs.defaultRoutePolicySelect.value = 'auto';
  if(routeRefs.congestionModeSelect) routeRefs.congestionModeSelect.value = 'balanced';
  if(routeRefs.maxRadioPayloadInput) routeRefs.maxRadioPayloadInput.value = '180';
  if(routeRefs.dropThresholdInput) routeRefs.dropThresholdInput.value = '12';
  if(routeRefs.ackSourceInput) routeRefs.ackSourceInput.value = '';
  if(routeRefs.ackRouteSelect) routeRefs.ackRouteSelect.value = 'radio_net';
  renderRouteGovernorBox();
  renderHandshakeBox();
  renderAckSourceBox();
};

initRouteGovernorLayer();
renderRouteGovernorBox();
renderHandshakeBox();
renderAckSourceBox();
renderQueueBoard();


/* ===== v1.6 ACK PROVENANCE + TRUST ===== */
state.ackProvenance = [];

const provRefs = {
  provSourceInput: document.getElementById('provSourceInput'),
  provRouteSelect: document.getElementById('provRouteSelect'),
  provTrustSelect: document.getElementById('provTrustSelect'),
  provLatencyInput: document.getElementById('provLatencyInput'),
  injectAckBtn: document.getElementById('injectAckBtn'),
  provBox: document.getElementById('provBox')
};

function initAckProvenance(){
  if(provRefs.injectAckBtn) provRefs.injectAckBtn.onclick = injectAck;
  renderProvBox();
}

function injectAck(){
  const item = {
    source: provRefs.provSourceInput.value || 'unknown',
    route: provRefs.provRouteSelect.value,
    trust: provRefs.provTrustSelect.value,
    latency: Number(provRefs.provLatencyInput.value || 0),
    timestamp: new Date().toISOString()
  };
  state.ackProvenance.unshift(item);
  applyTrustInjection(item);
  renderProvBox();
}

function trustScore(trust, latency){
  let base = trust === 'high' ? 5 : trust === 'moderate' ? 3 : 1;
  let penalty = latency > 60 ? 2 : latency > 20 ? 1 : 0;
  return Math.max(0, base - penalty);
}

function applyTrustInjection(item){
  const score = trustScore(item.trust, item.latency);
  state.truthHierarchy = state.truthHierarchy.map(t => {
    if(t.type === 'message' || t.type === 'cluster'){
      t.score += score * 0.2;
    }
    return t;
  });
}

function renderProvBox(){
  if(!provRefs.provBox) return;
  if(!state.ackProvenance.length){
    provRefs.provBox.innerHTML = 'No ACK provenance recorded.';
    return;
  }
  provRefs.provBox.innerHTML = state.ackProvenance.slice(0,5).map(p=>{
    return `<div>
      <strong>${p.source}</strong> (${p.route})<br>
      Trust: <span class="trust-${p.trust}">${p.trust}</span> • Latency: ${p.latency}s
    </div>`;
  }).join('<br>');
}

initAckProvenance();


/* ===== v1.7 HARD TRUST GOVERNOR ===== */
state.trustGovernor = {
  sectorClearThreshold: 4.0,
  staleAckSeconds: 60,
  conflictDeltaThreshold: 1.5,
  promoteTrustThreshold: 4.0,
  decisions: [],
  status: 'idle'
};

const trustGovRefs = {
  sectorClearTrustInput: document.getElementById('sectorClearTrustInput'),
  staleAckInput: document.getElementById('staleAckInput'),
  conflictDeltaInput: document.getElementById('conflictDeltaInput'),
  promoteTrustInput: document.getElementById('promoteTrustInput'),
  runTrustGovernorBtn: document.getElementById('runTrustGovernorBtn'),
  trustGovernorBox: document.getElementById('trustGovernorBox'),
  trustDecisionBoard: document.getElementById('trustDecisionBoard')
};

function initHardTrustGovernor(){
  if(trustGovRefs.runTrustGovernorBtn) trustGovRefs.runTrustGovernorBtn.onclick = runHardTrustGovernor;
  if(trustGovRefs.sectorClearTrustInput) trustGovRefs.sectorClearTrustInput.oninput = syncGovernorConfig;
  if(trustGovRefs.staleAckInput) trustGovRefs.staleAckInput.oninput = syncGovernorConfig;
  if(trustGovRefs.conflictDeltaInput) trustGovRefs.conflictDeltaInput.oninput = syncGovernorConfig;
  if(trustGovRefs.promoteTrustInput) trustGovRefs.promoteTrustInput.oninput = syncGovernorConfig;
  renderTrustGovernor();
}

function syncGovernorConfig(){
  state.trustGovernor.sectorClearThreshold = Number(trustGovRefs.sectorClearTrustInput?.value || 4.0);
  state.trustGovernor.staleAckSeconds = Number(trustGovRefs.staleAckInput?.value || 60);
  state.trustGovernor.conflictDeltaThreshold = Number(trustGovRefs.conflictDeltaInput?.value || 1.5);
  state.trustGovernor.promoteTrustThreshold = Number(trustGovRefs.promoteTrustInput?.value || 4.0);
}

function ackProvenanceScore(p){
  if(!p) return 0;
  let base = p.trust === 'high' ? 5 : p.trust === 'moderate' ? 3 : 1;
  let latencyPenalty = p.latency > state.trustGovernor.staleAckSeconds ? 2.2 : p.latency > 20 ? 1.0 : 0;
  let routeBonus = p.route === 'command_gateway' ? 0.8 : p.route === 'radio_net' ? 0.4 : 0.1;
  return Math.max(0, base + routeBonus - latencyPenalty);
}

function runHardTrustGovernor(){
  syncGovernorConfig();
  const decisions = [];
  const latestProv = state.ackProvenance?.[0] || null;
  const provScore = ackProvenanceScore(latestProv);

  // stale ACK handling
  if(latestProv){
    const stale = latestProv.latency > state.trustGovernor.staleAckSeconds;
    decisions.push({
      type: 'ack_freshness',
      state: stale ? 'warn' : 'pass',
      text: stale
        ? `ACK from ${latestProv.source} is stale (${latestProv.latency}s). Trust reduced.`
        : `ACK from ${latestProv.source} is inside freshness window.`
    });
  } else {
    decisions.push({
      type: 'ack_freshness',
      state: 'warn',
      text: 'No ACK provenance available. Govern conservatively.'
    });
  }

  // sector clearance gating
  const cleared = (state.sectors || []).filter(s => s.status === 'cleared');
  cleared.forEach(s => {
    const pass = provScore >= state.trustGovernor.sectorClearThreshold;
    decisions.push({
      type: 'sector_clearance',
      state: pass ? 'pass' : 'block',
      text: pass
        ? `Sector ${s.id} clear state allowed. Provenance score ${provScore.toFixed(2)}.`
        : `Sector ${s.id} clear state blocked. Provenance score ${provScore.toFixed(2)} below threshold ${state.trustGovernor.sectorClearThreshold.toFixed(2)}.`
    });
  });
  if(!cleared.length){
    decisions.push({
      type: 'sector_clearance',
      state: 'warn',
      text: 'No cleared sectors to govern.'
    });
  }

  // trusted source promotion
  const promote = provScore >= state.trustGovernor.promoteTrustThreshold;
  decisions.push({
    type: 'promotion',
    state: promote ? 'pass' : 'warn',
    text: promote
      ? `Trusted ACK source qualifies for decision-layer promotion (${provScore.toFixed(2)}).`
      : `ACK source does not qualify for decision-layer promotion (${provScore.toFixed(2)}).`
  });

  // conflict detection against top truth item
  const top = (state.truthHierarchy || [])[0];
  const second = (state.truthHierarchy || [])[1];
  if(top && second){
    const delta = Math.abs(Number(top.score || 0) - Number(second.score || 0));
    const conflict = delta <= state.trustGovernor.conflictDeltaThreshold;
    decisions.push({
      type: 'truth_conflict',
      state: conflict ? 'warn' : 'pass',
      text: conflict
        ? `Truth conflict state: top sources are too close (${delta.toFixed(2)} delta).`
        : `Truth dominance clear enough (${delta.toFixed(2)} delta).`
    });
  } else {
    decisions.push({
      type: 'truth_conflict',
      state: 'warn',
      text: 'Not enough truth sources to evaluate conflict.'
    });
  }

  // decision lock if low trust + critical environment
  try{
    const exposure = typeof computeExposureClock === 'function' ? computeExposureClock() : null;
    const lock = exposure && exposure.severity >= 4 && provScore < state.trustGovernor.promoteTrustThreshold;
    decisions.push({
      type: 'decision_lock',
      state: lock ? 'block' : 'pass',
      text: lock
        ? `Decision lock active: critical exposure with insufficient trusted ACK support.`
        : `No critical decision lock triggered.`
    });
  }catch(err){}

  state.trustGovernor.decisions = decisions;
  state.trustGovernor.status = decisions.some(d => d.state === 'block') ? 'block'
    : decisions.some(d => d.state === 'warn') ? 'warn'
    : 'pass';

  renderTrustGovernor();
}

function renderTrustGovernor(){
  if(!trustGovRefs.trustGovernorBox || !trustGovRefs.trustDecisionBoard) return;
  const status = state.trustGovernor.status || 'idle';
  const cls = status === 'pass' ? 'governor-pass' : status === 'warn' ? 'governor-warn' : status === 'block' ? 'governor-block' : '';
  trustGovRefs.trustGovernorBox.className = `result-card small ${cls}`;
  trustGovRefs.trustGovernorBox.innerHTML =
    `<strong>TRUST GOVERNOR</strong><br>` +
    `Status: <strong>${status.toUpperCase()}</strong><br>` +
    `Sector clear threshold: <strong>${state.trustGovernor.sectorClearThreshold.toFixed(1)}</strong><br>` +
    `Stale ACK threshold: <strong>${state.trustGovernor.staleAckSeconds}s</strong><br>` +
    `Conflict delta: <strong>${state.trustGovernor.conflictDeltaThreshold.toFixed(1)}</strong><br>` +
    `Promote threshold: <strong>${state.trustGovernor.promoteTrustThreshold.toFixed(1)}</strong>`;

  trustGovRefs.trustDecisionBoard.innerHTML = '';
  const decisions = state.trustGovernor.decisions || [];
  if(!decisions.length){
    trustGovRefs.trustDecisionBoard.innerHTML = '<div class="timeline-item">No trust-governor decisions yet.</div>';
    return;
  }
  decisions.forEach(d => {
    const div = document.createElement('div');
    div.className = `timeline-item governor-${d.state === 'pass' ? 'pass' : d.state === 'warn' ? 'warn' : 'block'}`;
    div.innerHTML = `<div class="timeline-item-head"><strong>${d.type.replaceAll('_',' ')}</strong><span class="tag">${d.state.toUpperCase()}</span></div><div>${d.text}</div>`;
    trustGovRefs.trustDecisionBoard.appendChild(div);
  });
}

const __oldInjectAck_v17 = injectAck;
injectAck = function(){
  __oldInjectAck_v17();
  try{ runHardTrustGovernor(); }catch(err){}
};

const __oldAddOrUpdateSector_v17 = addOrUpdateSector;
addOrUpdateSector = function(){
  __oldAddOrUpdateSector_v17();
  try{ runHardTrustGovernor(); }catch(err){}
};

const __oldBuildExportPayload_v17 = buildExportPayload;
buildExportPayload = function(){
  const payload = __oldBuildExportPayload_v17();
  payload.trustGovernor = state.trustGovernor;
  return payload;
};

const __oldHydrate_v17 = hydrateFromPayload;
hydrateFromPayload = function(data){
  __oldHydrate_v17(data);
  if(data.trustGovernor) state.trustGovernor = data.trustGovernor;
  if(trustGovRefs.sectorClearTrustInput) trustGovRefs.sectorClearTrustInput.value = String(state.trustGovernor.sectorClearThreshold ?? 4.0);
  if(trustGovRefs.staleAckInput) trustGovRefs.staleAckInput.value = String(state.trustGovernor.staleAckSeconds ?? 60);
  if(trustGovRefs.conflictDeltaInput) trustGovRefs.conflictDeltaInput.value = String(state.trustGovernor.conflictDeltaThreshold ?? 1.5);
  if(trustGovRefs.promoteTrustInput) trustGovRefs.promoteTrustInput.value = String(state.trustGovernor.promoteTrustThreshold ?? 4.0);
  renderTrustGovernor();
};

const __oldClearMission_v17 = clearMission;
clearMission = function(){
  __oldClearMission_v17();
  state.trustGovernor = {
    sectorClearThreshold: 4.0,
    staleAckSeconds: 60,
    conflictDeltaThreshold: 1.5,
    promoteTrustThreshold: 4.0,
    decisions: [],
    status: 'idle'
  };
  if(trustGovRefs.sectorClearTrustInput) trustGovRefs.sectorClearTrustInput.value = '4.0';
  if(trustGovRefs.staleAckInput) trustGovRefs.staleAckInput.value = '60';
  if(trustGovRefs.conflictDeltaInput) trustGovRefs.conflictDeltaInput.value = '1.5';
  if(trustGovRefs.promoteTrustInput) trustGovRefs.promoteTrustInput.value = '4.0';
  renderTrustGovernor();
};

initHardTrustGovernor();
renderTrustGovernor();


/* ===== v1.8 TRUST REGISTRY + DECISION LOCK VISIBILITY ===== */
state.trustRegistry = [];

const registryRefs = {
  registrySourceInput: document.getElementById('registrySourceInput'),
  registryAllowSelect: document.getElementById('registryAllowSelect'),
  registryTrustSelect: document.getElementById('registryTrustSelect'),
  registryClassSelect: document.getElementById('registryClassSelect'),
  registryNoteInput: document.getElementById('registryNoteInput'),
  addRegistryBtn: document.getElementById('addRegistryBtn'),
  clearRegistryBtn: document.getElementById('clearRegistryBtn'),
  trustRegistryBoard: document.getElementById('trustRegistryBoard'),
  decisionLockMapBox: document.getElementById('decisionLockMapBox'),
  decisionLockSectorBox: document.getElementById('decisionLockSectorBox')
};

function initTrustRegistryLayer(){
  if(registryRefs.addRegistryBtn) registryRefs.addRegistryBtn.onclick = addOrUpdateRegistrySource;
  if(registryRefs.clearRegistryBtn) registryRefs.clearRegistryBtn.onclick = clearTrustRegistry;
  renderTrustRegistryBoard();
  renderDecisionLockVisibility();
}

function addOrUpdateRegistrySource(){
  const sourceId = (registryRefs.registrySourceInput?.value || '').trim();
  if(!sourceId) return;
  const allowStatus = registryRefs.registryAllowSelect?.value || 'allowed';
  const trustClass = registryRefs.registryTrustSelect?.value || 'moderate';
  const sourceClass = registryRefs.registryClassSelect?.value || 'unknown';
  const note = (registryRefs.registryNoteInput?.value || '').trim();
  const existing = state.trustRegistry.findIndex(s => s.sourceId.toLowerCase() === sourceId.toLowerCase());
  const item = {
    sourceId,
    allowStatus,
    trustClass,
    sourceClass,
    note,
    updatedAt: new Date().toISOString()
  };
  if(existing >= 0) state.trustRegistry[existing] = item;
  else state.trustRegistry.unshift(item);
  renderTrustRegistryBoard();
  runHardTrustGovernor();
}

function clearTrustRegistry(){
  state.trustRegistry = [];
  renderTrustRegistryBoard();
  renderDecisionLockVisibility();
}

function registryTrustAdjustment(sourceId){
  if(!sourceId) return 0;
  const item = state.trustRegistry.find(s => s.sourceId.toLowerCase() === String(sourceId).toLowerCase());
  if(!item) return 0;
  if(item.allowStatus === 'blocked') return -4.0;
  if(item.allowStatus === 'restricted') return -1.2;
  if(item.trustClass === 'high') return 1.0;
  if(item.trustClass === 'moderate') return 0.35;
  return -0.3;
}

function renderTrustRegistryBoard(){
  if(!registryRefs.trustRegistryBoard) return;
  registryRefs.trustRegistryBoard.innerHTML = '';
  if(!state.trustRegistry.length){
    registryRefs.trustRegistryBoard.innerHTML = '<div class="timeline-item">No trusted sources registered yet.</div>';
    return;
  }
  state.trustRegistry.slice(0,20).forEach(item => {
    const div = document.createElement('div');
    div.className = `timeline-item registry-${item.allowStatus}`;
    div.innerHTML = `<div class="timeline-item-head"><strong>${item.sourceId}</strong><span class="tag">${item.allowStatus} • ${item.trustClass} • ${item.sourceClass}</span></div>
      <div>${item.note || 'No note'}<br>Updated: ${new Date(item.updatedAt).toLocaleTimeString()}</div>`;
    registryRefs.trustRegistryBoard.appendChild(div);
  });
}

function renderDecisionLockVisibility(){
  if(!registryRefs.decisionLockMapBox || !registryRefs.decisionLockSectorBox) return;
  const status = state.trustGovernor?.status || 'idle';
  const cls = status === 'pass' ? 'lock-pass' : status === 'warn' ? 'lock-warn' : status === 'block' ? 'lock-block' : '';
  registryRefs.decisionLockMapBox.className = `result-card small ${cls}`;
  registryRefs.decisionLockSectorBox.className = `result-card small ${cls}`;

  const exposure = typeof computeExposureClock === 'function' ? computeExposureClock() : null;
  const blockedSectors = (state.trustGovernor?.decisions || []).filter(d => d.type === 'sector_clearance' && d.state === 'block');
  const top = (state.truthHierarchy || [])[0];

  registryRefs.decisionLockMapBox.innerHTML =
    `<strong>MAP DECISION LOCK</strong><br>` +
    `Governor: <strong>${status.toUpperCase()}</strong><br>` +
    `${status === 'block' ? 'Overlay state: <strong>LOCKED</strong><br>' : status === 'warn' ? 'Overlay state: <strong>CAUTION</strong><br>' : 'Overlay state: <strong>CLEAR</strong><br>'}` +
    `Top truth: <strong>${top ? top.label : 'none'}</strong><br>` +
    `Exposure: <strong>${exposure ? `${exposure.severity}/5 · ${exposure.label}` : 'n/a'}</strong>`;

  registryRefs.decisionLockSectorBox.innerHTML =
    `<strong>SECTOR LOCK STATUS</strong><br>` +
    `Blocked sector clearances: <strong>${blockedSectors.length}</strong><br>` +
    `${blockedSectors.length ? blockedSectors.map(d => d.text).join('<br>') : 'No sector-clear blocks active.'}`;
}

const __oldAckScore_v18 = ackProvenanceScore;
ackProvenanceScore = function(p){
  const base = __oldAckScore_v18(p);
  const regAdj = registryTrustAdjustment(p?.source);
  return Math.max(0, base + regAdj);
};

const __oldRunGovernor_v18 = runHardTrustGovernor;
runHardTrustGovernor = function(){
  __oldRunGovernor_v18();
  renderDecisionLockVisibility();
};

const __oldInjectAck_v18 = injectAck;
injectAck = function(){
  __oldInjectAck_v18();
  renderDecisionLockVisibility();
};

const __oldBuildExportPayload_v18 = buildExportPayload;
buildExportPayload = function(){
  const payload = __oldBuildExportPayload_v18();
  payload.trustRegistry = state.trustRegistry;
  return payload;
};

const __oldHydrate_v18 = hydrateFromPayload;
hydrateFromPayload = function(data){
  __oldHydrate_v18(data);
  if(Array.isArray(data.trustRegistry)) state.trustRegistry = data.trustRegistry;
  renderTrustRegistryBoard();
  renderDecisionLockVisibility();
};

const __oldClearMission_v18 = clearMission;
clearMission = function(){
  __oldClearMission_v18();
  state.trustRegistry = [];
  if(registryRefs.registrySourceInput) registryRefs.registrySourceInput.value = '';
  if(registryRefs.registryAllowSelect) registryRefs.registryAllowSelect.value = 'allowed';
  if(registryRefs.registryTrustSelect) registryRefs.registryTrustSelect.value = 'moderate';
  if(registryRefs.registryClassSelect) registryRefs.registryClassSelect.value = 'unknown';
  if(registryRefs.registryNoteInput) registryRefs.registryNoteInput.value = '';
  renderTrustRegistryBoard();
  renderDecisionLockVisibility();
};

initTrustRegistryLayer();
renderTrustRegistryBoard();
renderDecisionLockVisibility();


/* ===== v1.9 TRACK DECAY + SIGNAL CONFIDENCE ===== */
state.teamSignals = [];

const teamSignalRefs = {
  teamSignalCallsignInput: document.getElementById('teamSignalCallsignInput'),
  teamSignalSourceTypeSelect: document.getElementById('teamSignalSourceTypeSelect'),
  teamSignalSourceIdInput: document.getElementById('teamSignalSourceIdInput'),
  teamSignalMinutesInput: document.getElementById('teamSignalMinutesInput'),
  teamSignalNoteInput: document.getElementById('teamSignalNoteInput'),
  addTeamSignalBtn: document.getElementById('addTeamSignalBtn'),
  radioConfirmBtn: document.getElementById('radioConfirmBtn'),
  clearTeamSignalsBtn: document.getElementById('clearTeamSignalsBtn'),
  teamSignalBoard: document.getElementById('teamSignalBoard')
};

function initTrackDecayLayer(){
  if(teamSignalRefs.addTeamSignalBtn) teamSignalRefs.addTeamSignalBtn.onclick = addOrUpdateTeamSignal;
  if(teamSignalRefs.radioConfirmBtn) teamSignalRefs.radioConfirmBtn.onclick = radioConfirmTeamSignal;
  if(teamSignalRefs.clearTeamSignalsBtn) teamSignalRefs.clearTeamSignalsBtn.onclick = clearTeamSignals;
  renderTeamSignalBoard();
}

function sourceWeight(type){
  const map = {
    tracking: 0.4,
    radio_direct: 0.5,
    radio_relay: 0.25,
    visual: 0.6,
    unknown: 0.0
  };
  return map[type] ?? 0;
}

function timeDecayBase(minutes){
  if(minutes < 10) return 1.0;
  if(minutes < 30) return 0.7;
  if(minutes < 60) return 0.4;
  return 0.15;
}

function registryAdjustmentForSource(sourceId){
  if(typeof registryTrustAdjustment === 'function') return registryTrustAdjustment(sourceId);
  return 0;
}

function computeTeamSignalConfidence(sourceType, sourceId, minutes){
  const raw = Math.max(0, Math.min(2.0, timeDecayBase(minutes) + sourceWeight(sourceType) + registryAdjustmentForSource(sourceId)));
  const label = raw > 1.2 ? 'HIGH' : raw >= 0.6 ? 'MODERATE' : 'LOW';
  const cls = raw > 1.2 ? 'conf-high' : raw >= 0.6 ? 'conf-moderate' : 'conf-low';
  return { score: raw, label, cls };
}

function computeDecayState(minutes, confLabel){
  if(confLabel === 'HIGH' && minutes < 15) return { state:'GREEN', cls:'decay-green', trend:'stable' };
  if(confLabel === 'LOW' || minutes > 45) return { state:'RED', cls:'decay-red', trend:'degrading' };
  return { state:'YELLOW', cls:'decay-yellow', trend:'degrading' };
}

function addOrUpdateTeamSignal(){
  const callsign = (teamSignalRefs.teamSignalCallsignInput?.value || '').trim();
  if(!callsign) return;
  const sourceType = teamSignalRefs.teamSignalSourceTypeSelect?.value || 'tracking';
  const sourceId = (teamSignalRefs.teamSignalSourceIdInput?.value || '').trim() || callsign;
  const minutes = Number(teamSignalRefs.teamSignalMinutesInput?.value || 0);
  const note = (teamSignalRefs.teamSignalNoteInput?.value || '').trim();
  const confidence = computeTeamSignalConfidence(sourceType, sourceId, minutes);
  const decay = computeDecayState(minutes, confidence.label);
  const item = {
    id: callsign.toUpperCase(),
    callsign,
    sourceType,
    sourceId,
    lastSeenTs: new Date(Date.now() - minutes * 60000).toISOString(),
    confidenceScore: confidence.score,
    confidenceLabel: confidence.label,
    confidenceClass: confidence.cls,
    decayState: decay.state,
    decayClass: decay.cls,
    trend: decay.trend,
    notes: note
  };
  const existing = state.teamSignals.findIndex(t => t.id === item.id);
  if(existing >= 0) state.teamSignals[existing] = item;
  else state.teamSignals.unshift(item);
  renderTeamSignalBoard();
  renderDecisionLockVisibility();
}

function radioConfirmTeamSignal(){
  const callsign = (teamSignalRefs.teamSignalCallsignInput?.value || '').trim();
  if(!callsign) return;
  if(teamSignalRefs.teamSignalSourceTypeSelect) teamSignalRefs.teamSignalSourceTypeSelect.value = 'radio_direct';
  if(teamSignalRefs.teamSignalMinutesInput) teamSignalRefs.teamSignalMinutesInput.value = '0';
  if(teamSignalRefs.teamSignalSourceIdInput && !teamSignalRefs.teamSignalSourceIdInput.value.trim()){
    teamSignalRefs.teamSignalSourceIdInput.value = callsign;
  }
  addOrUpdateTeamSignal();
}

function clearTeamSignals(){
  state.teamSignals = [];
  renderTeamSignalBoard();
  renderDecisionLockVisibility();
}

function renderTeamSignalBoard(){
  if(!teamSignalRefs.teamSignalBoard) return;
  teamSignalRefs.teamSignalBoard.innerHTML = '';
  if(!state.teamSignals.length){
    teamSignalRefs.teamSignalBoard.innerHTML = '<div class="timeline-item">No team signals recorded yet.</div>';
    return;
  }
  state.teamSignals.slice(0,20).forEach(item => {
    const mins = Math.max(0, Math.floor((Date.now() - new Date(item.lastSeenTs).getTime())/60000));
    const div = document.createElement('div');
    div.className = `timeline-item ${item.decayClass}`;
    div.innerHTML = `<div class="timeline-item-head"><strong>${item.callsign}</strong><span class="tag ${item.confidenceClass}">${item.confidenceLabel} • ${item.decayState}</span></div>
      <div>Last: ${mins} min ago<br>Source: ${item.sourceType.replaceAll('_',' ')}<br>Confidence: <span class="${item.confidenceClass}">${item.confidenceLabel}</span> (${item.confidenceScore.toFixed(2)})<br>Trend: ${item.trend}<br>${item.notes || 'No note'}</div>`;
    teamSignalRefs.teamSignalBoard.appendChild(div);
  });
}

const __oldRenderDecisionLockVisibility_v19 = renderDecisionLockVisibility;
renderDecisionLockVisibility = function(){
  __oldRenderDecisionLockVisibility_v19();
  try{
    if(!registryRefs.decisionLockMapBox || !registryRefs.decisionLockSectorBox) return;
    const redCount = state.teamSignals.filter(t => t.decayState === 'RED').length;
    const yellowCount = state.teamSignals.filter(t => t.decayState === 'YELLOW').length;
    registryRefs.decisionLockMapBox.innerHTML += `<br><br><strong>TEAM SIGNAL OVERLAY</strong><br>Red tracks: <strong>${redCount}</strong><br>Yellow tracks: <strong>${yellowCount}</strong>`;
    if(redCount > 0){
      registryRefs.decisionLockSectorBox.innerHTML += `<br><br><strong>TRACK DECAY WARNING</strong><br>${redCount} team signal(s) are RED / unreliable.`;
    }
  }catch(err){}
};

const __oldBuildExportPayload_v19 = buildExportPayload;
buildExportPayload = function(){
  const payload = __oldBuildExportPayload_v19();
  payload.teamSignals = state.teamSignals;
  return payload;
};

const __oldHydrate_v19 = hydrateFromPayload;
hydrateFromPayload = function(data){
  __oldHydrate_v19(data);
  if(Array.isArray(data.teamSignals)) state.teamSignals = data.teamSignals;
  renderTeamSignalBoard();
  renderDecisionLockVisibility();
};

const __oldClearMission_v19 = clearMission;
clearMission = function(){
  __oldClearMission_v19();
  state.teamSignals = [];
  if(teamSignalRefs.teamSignalCallsignInput) teamSignalRefs.teamSignalCallsignInput.value = '';
  if(teamSignalRefs.teamSignalSourceTypeSelect) teamSignalRefs.teamSignalSourceTypeSelect.value = 'tracking';
  if(teamSignalRefs.teamSignalSourceIdInput) teamSignalRefs.teamSignalSourceIdInput.value = '';
  if(teamSignalRefs.teamSignalMinutesInput) teamSignalRefs.teamSignalMinutesInput.value = '3';
  if(teamSignalRefs.teamSignalNoteInput) teamSignalRefs.teamSignalNoteInput.value = '';
  renderTeamSignalBoard();
  renderDecisionLockVisibility();
};

initTrackDecayLayer();
renderTeamSignalBoard();
renderDecisionLockVisibility();


/* ===== v2.0 MAP OVERLAY DOTS + SECTOR RISK ===== */
const sectorRiskRefs = {
  sectorRiskBox: document.getElementById('sectorRiskBox')
};

function initMapDotsSectorRiskLayer(){
  patchSignalMapWithTeamDots();
  renderSectorRiskCoupling();
}

function teamSignalColor(signal){
  if(signal.decayState === 'GREEN') return '#96f0bf';
  if(signal.decayState === 'YELLOW') return '#ffcf6b';
  return '#ff8f8f';
}

function patchSignalMapWithTeamDots(){
  const __oldDrawSignalMap_v20 = drawSignalMap;
  drawSignalMap = function(){
    __oldDrawSignalMap_v20();
    try{
      const canvas = refs.signalMap;
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext('2d');
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

      const signals = (state.teamSignals || []).slice(0,10);
      if(!signals.length) return;

      let railX = rect.width - 150;
      let railY = 18;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.fillRect(railX-10, railY-10, 144, Math.max(30, signals.length*18 + 20));
      ctx.font = '11px system-ui';
      signals.forEach((sig, i) => {
        const y = railY + i*18;
        ctx.fillStyle = teamSignalColor(sig);
        ctx.beginPath();
        ctx.arc(railX, y, 5, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#eef4f9';
        ctx.fillText(sig.callsign, railX + 10, y + 4);
      });
      ctx.restore();
    }catch(err){}
  };
}

function riskBand(score){
  if(score >= 2.5) return {label:'HIGH', cls:'risk-high'};
  if(score >= 1.0) return {label:'MODERATE', cls:'risk-moderate'};
  return {label:'LOW', cls:'risk-low'};
}

function computeSectorRiskCoupling(){
  const redSignals = (state.teamSignals || []).filter(t => t.decayState === 'RED');
  const yellowSignals = (state.teamSignals || []).filter(t => t.decayState === 'YELLOW');
  const sectors = state.sectors || [];
  const results = [];

  sectors.forEach(sector => {
    let risk = 0;
    const notes = [];
    if(sector.status === 'active') risk += 0.5;
    if(sector.priority === 'critical') risk += 1.0;
    if(sector.priority === 'elevated') risk += 0.5;

    const assigned = String(sector.assignedTo || '').toUpperCase();
    const redForSector = redSignals.filter(t => assigned && assigned.includes(String(t.callsign || '').toUpperCase()));
    const yellowForSector = yellowSignals.filter(t => assigned && assigned.includes(String(t.callsign || '').toUpperCase()));

    if(redForSector.length){
      risk += 2.2 * redForSector.length;
      notes.push(`${redForSector.length} red team signal(s) tied to sector assignee`);
    }
    if(yellowForSector.length){
      risk += 0.8 * yellowForSector.length;
      notes.push(`${yellowForSector.length} yellow team signal(s) tied to sector assignee`);
    }

    if(sector.status === 'cleared' && redForSector.length){
      risk += 1.5;
      notes.push('Sector marked cleared but assignee has red signal decay');
    }

    results.push({
      id: sector.id,
      status: sector.status,
      assignedTo: sector.assignedTo,
      priority: sector.priority,
      risk,
      notes
    });
  });

  return results.sort((a,b)=>b.risk-a.risk);
}

function renderSectorRiskCoupling(){
  if(!sectorRiskRefs.sectorRiskBox) return;
  const results = computeSectorRiskCoupling();
  if(!results.length){
    sectorRiskRefs.sectorRiskBox.innerHTML = 'No sector risk data yet.';
    return;
  }

  const top = results[0];
  const band = riskBand(top.risk);
  sectorRiskRefs.sectorRiskBox.className = `result-card small ${band.cls}`;
  sectorRiskRefs.sectorRiskBox.innerHTML =
    `<strong>SECTOR RISK</strong><br>` +
    `Top risk sector: <strong>${top.id}</strong><br>` +
    `Risk band: <strong>${band.label} (${top.risk.toFixed(2)})</strong><br>` +
    `Assigned: <strong>${top.assignedTo || 'none'}</strong><br>` +
    `${top.notes.length ? top.notes.join('<br>') : 'No special coupling notes.'}`;
}

const __oldRenderTeamSignalBoard_v20 = renderTeamSignalBoard;
renderTeamSignalBoard = function(){
  __oldRenderTeamSignalBoard_v20();
  try{
    renderSectorRiskCoupling();
    drawSignalMap();
  }catch(err){}
};

const __oldRenderSectorBoard_v20 = renderSectorBoard;
renderSectorBoard = function(){
  __oldRenderSectorBoard_v20();
  try{ renderSectorRiskCoupling(); }catch(err){}
};

const __oldBuildExportPayload_v20 = buildExportPayload;
buildExportPayload = function(){
  const payload = __oldBuildExportPayload_v20();
  payload.sectorRiskCoupling = computeSectorRiskCoupling();
  return payload;
};

const __oldHydrate_v20 = hydrateFromPayload;
hydrateFromPayload = function(data){
  __oldHydrate_v20(data);
  renderSectorRiskCoupling();
  drawSignalMap();
};

const __oldClearMission_v20 = clearMission;
clearMission = function(){
  __oldClearMission_v20();
  renderSectorRiskCoupling();
  drawSignalMap();
};

initMapDotsSectorRiskLayer();
renderSectorRiskCoupling();
drawSignalMap();


/* ===== v2.1 GPS PLOTTING + GPX/GEOJSON + LIVE DECAY + AAR ===== */
state.liveDecayClock = { running:false, timer:null };
state.afterAction = { title:'', notes:'', generatedAt:null, body:'' };

const v21Refs = {
  teamSignalLatInput: document.getElementById('teamSignalLatInput'),
  teamSignalLonInput: document.getElementById('teamSignalLonInput'),
  exportGpxBtn: document.getElementById('exportGpxBtn'),
  exportGeoJsonBtn: document.getElementById('exportGeoJsonBtn'),
  bridgeExportBox: document.getElementById('bridgeExportBox'),
  startDecayClockBtn: document.getElementById('startDecayClockBtn'),
  stopDecayClockBtn: document.getElementById('stopDecayClockBtn'),
  decayClockBox: document.getElementById('decayClockBox'),
  aarTitleInput: document.getElementById('aarTitleInput'),
  aarNotesInput: document.getElementById('aarNotesInput'),
  generateAarBtn: document.getElementById('generateAarBtn'),
  exportAarBtn: document.getElementById('exportAarBtn'),
  aarBox: document.getElementById('aarBox')
};

function initV21Layer(){
  if(v21Refs.exportGpxBtn) v21Refs.exportGpxBtn.onclick = exportGPXBridge;
  if(v21Refs.exportGeoJsonBtn) v21Refs.exportGeoJsonBtn.onclick = exportGeoJSONBridge;
  if(v21Refs.startDecayClockBtn) v21Refs.startDecayClockBtn.onclick = startLiveDecayClock;
  if(v21Refs.stopDecayClockBtn) v21Refs.stopDecayClockBtn.onclick = stopLiveDecayClock;
  if(v21Refs.generateAarBtn) v21Refs.generateAarBtn.onclick = generateAfterActionReport;
  if(v21Refs.exportAarBtn) v21Refs.exportAarBtn.onclick = exportAfterActionReport;
  renderDecayClock();
  renderAfterActionBox();
}

function teamSignalCoordsFromInputs(){
  const lat = Number(v21Refs.teamSignalLatInput?.value);
  const lon = Number(v21Refs.teamSignalLonInput?.value);
  if(Number.isFinite(lat) && Number.isFinite(lon)) return {lat, lon};
  return null;
}

const __oldAddOrUpdateTeamSignal_v21 = addOrUpdateTeamSignal;
addOrUpdateTeamSignal = function(){
  const callsign = (teamSignalRefs.teamSignalCallsignInput?.value || '').trim();
  const coords = teamSignalCoordsFromInputs();
  __oldAddOrUpdateTeamSignal_v21();
  if(!callsign) return;
  if(coords){
    const existing = state.teamSignals.findIndex(t => String(t.id||'').toUpperCase() === callsign.toUpperCase());
    if(existing >= 0){
      state.teamSignals[existing].position = coords;
    }
  }
  renderTeamSignalBoard();
  try{ drawSignalMap(); }catch(err){}
};

function exportGPXBridge(){
  const points = (state.teamSignals || []).filter(t => t.position && Number.isFinite(t.position.lat) && Number.isFinite(t.position.lon));
  const tracks = (state.gpsPoints || []).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  const wpts = points.map(t => `  <wpt lat="${t.position.lat}" lon="${t.position.lon}"><name>${escapeXml(t.callsign)}</name><desc>${escapeXml(`${t.sourceType} ${t.confidenceLabel} ${t.decayState}`)}</desc></wpt>`).join('\n');
  const trkpts = tracks.map(p => `        <trkpt lat="${p.lat}" lon="${p.lon}"><time>${p.ts || new Date().toISOString()}</time></trkpt>`).join('\n');
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="FIELDSCOPE" xmlns="http://www.topografix.com/GPX/1/1">
${wpts}
  <trk>
    <name>FIELDSCOPE Operator Track</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
  downloadBlob(gpx, 'fieldscope-bridge-export.gpx', 'application/gpx+xml');
  if(v21Refs.bridgeExportBox) v21Refs.bridgeExportBox.innerHTML = `GPX exported.<br>Waypoints: <strong>${points.length}</strong><br>Track points: <strong>${tracks.length}</strong>`;
}

function exportGeoJSONBridge(){
  const features = [];
  (state.teamSignals || []).forEach(t => {
    if(t.position && Number.isFinite(t.position.lat) && Number.isFinite(t.position.lon)){
      features.push({
        type:'Feature',
        geometry:{ type:'Point', coordinates:[t.position.lon, t.position.lat] },
        properties:{
          callsign:t.callsign,
          sourceType:t.sourceType,
          confidence:t.confidenceLabel,
          decayState:t.decayState,
          notes:t.notes || ''
        }
      });
    }
  });
  const lineCoords = (state.gpsPoints || []).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon)).map(p => [p.lon, p.lat]);
  if(lineCoords.length){
    features.push({
      type:'Feature',
      geometry:{ type:'LineString', coordinates:lineCoords },
      properties:{ name:'FIELDSCOPE Operator Track' }
    });
  }
  const geojson = { type:'FeatureCollection', features };
  downloadBlob(JSON.stringify(geojson, null, 2), 'fieldscope-bridge-export.geojson', 'application/geo+json');
  if(v21Refs.bridgeExportBox) v21Refs.bridgeExportBox.innerHTML = `GeoJSON exported.<br>Features: <strong>${features.length}</strong>`;
}

function escapeXml(s){
  return String(s || '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
}

function recomputeAllTeamSignalsFromLastSeen(){
  if(typeof computeTeamSignalConfidence !== 'function' || typeof computeDecayState !== 'function') return;
  (state.teamSignals || []).forEach(item => {
    const mins = Math.max(0, (Date.now() - new Date(item.lastSeenTs).getTime()) / 60000);
    const confidence = computeTeamSignalConfidence(item.sourceType, item.sourceId, mins);
    const decay = computeDecayState(mins, confidence.label);
    item.confidenceScore = confidence.score;
    item.confidenceLabel = confidence.label;
    item.confidenceClass = confidence.cls;
    item.decayState = decay.state;
    item.decayClass = decay.cls;
    item.trend = decay.trend;
  });
}

function startLiveDecayClock(){
  if(state.liveDecayClock.running) return;
  state.liveDecayClock.running = true;
  state.liveDecayClock.timer = setInterval(() => {
    recomputeAllTeamSignalsFromLastSeen();
    renderTeamSignalBoard();
    try{
      renderDecisionLockVisibility();
      renderSectorRiskCoupling();
      drawSignalMap();
    }catch(err){}
    renderDecayClock();
  }, 15000);
  renderDecayClock();
}

function stopLiveDecayClock(){
  if(state.liveDecayClock.timer) clearInterval(state.liveDecayClock.timer);
  state.liveDecayClock.timer = null;
  state.liveDecayClock.running = false;
  renderDecayClock();
}

function renderDecayClock(){
  if(!v21Refs.decayClockBox) return;
  const oldest = (state.teamSignals || []).reduce((a,b) => {
    if(!a) return b;
    return new Date(a.lastSeenTs).getTime() < new Date(b.lastSeenTs).getTime() ? a : b;
  }, null);
  const oldestMins = oldest ? Math.max(0, Math.floor((Date.now() - new Date(oldest.lastSeenTs).getTime())/60000)) : 0;
  v21Refs.decayClockBox.innerHTML =
    `<strong>DECAY CLOCK</strong><br>` +
    `State: <strong>${state.liveDecayClock.running ? 'RUNNING' : 'IDLE'}</strong><br>` +
    `Signals tracked: <strong>${(state.teamSignals || []).length}</strong><br>` +
    `Oldest signal age: <strong>${oldest ? `${oldest.callsign} • ${oldestMins} min` : 'none'}</strong>`;
}

function generateAfterActionReport(){
  const title = (v21Refs.aarTitleInput?.value || '').trim() || 'FIELDSCOPE After-Action Report';
  const notes = (v21Refs.aarNotesInput?.value || '').trim();
  const redCount = (state.teamSignals || []).filter(t => t.decayState === 'RED').length;
  const yellowCount = (state.teamSignals || []).filter(t => t.decayState === 'YELLOW').length;
  const topRisk = typeof computeSectorRiskCoupling === 'function' ? (computeSectorRiskCoupling()[0] || null) : null;
  const topTruth = (state.truthHierarchy || [])[0] || null;
  const govStatus = state.trustGovernor?.status || 'idle';
  const body = `TITLE: ${title}
GENERATED: ${new Date().toLocaleString()}

MISSION SNAPSHOT
Callsign: ${state.callsign || 'unset'}
Role: ${state.role}
Mode: ${state.mode}
Subject: ${state.subjectType}
Elapsed Since Contact: ${Number(state.elapsedHours || 0).toFixed(2)}h
Environment: ${state.environment?.summary || 'none'}

TRUST / RISK
Trust Governor: ${govStatus}
Top Truth Source: ${topTruth ? `${topTruth.label} (${Number(topTruth.score || 0).toFixed(2)})` : 'none'}
Top Sector Risk: ${topRisk ? `${topRisk.id} (${Number(topRisk.risk || 0).toFixed(2)})` : 'none'}

TEAM SIGNALS
Red: ${redCount}
Yellow: ${yellowCount}
Tracked Teams: ${(state.teamSignals || []).length}

COMMUNICATIONS
Queued Packets: ${(state.packetQueue || []).length}
ACKed Packets: ${(state.ackedPackets || []).length}
Failed Packets: ${(state.failedPackets || []).length}
Radio Gateway: ${state.radioGateway?.status || 'n/a'}
Route Policy: ${state.routeGovernor?.defaultPolicy || 'n/a'}

OPERATOR NOTES
${notes || 'none'}
`;
  state.afterAction = { title, notes, generatedAt:new Date().toISOString(), body };
  renderAfterActionBox();
}

function renderAfterActionBox(){
  if(!v21Refs.aarBox) return;
  if(!state.afterAction?.body){
    v21Refs.aarBox.textContent = 'No after-action report generated yet.';
    return;
  }
  v21Refs.aarBox.innerHTML =
    `<strong>${state.afterAction.title}</strong><br>` +
    `Generated: <strong>${new Date(state.afterAction.generatedAt).toLocaleString()}</strong><br>` +
    `${state.afterAction.body.replaceAll('\n','<br>')}`;
}

function exportAfterActionReport(){
  if(!state.afterAction?.body) generateAfterActionReport();
  downloadBlob(state.afterAction.body, 'fieldscope-after-action-report.txt', 'text/plain;charset=utf-8');
}

const __oldPatchSignalMap_v21 = drawSignalMap;
drawSignalMap = function(){
  __oldPatchSignalMap_v21();
  try{
    const canvas = refs.signalMap;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    const pts = (state.teamSignals || []).filter(t => t.position && Number.isFinite(t.position.lat) && Number.isFinite(t.position.lon));
    if(!pts.length || !(state.gpsPoints || []).length) return;

    const base = state.gpsPoints[0];
    const all = [];
    pts.forEach(t => {
      const x = (t.position.lon - base.lon) * Math.cos(base.lat * Math.PI / 180) * 111320;
      const y = (t.position.lat - base.lat) * 110540;
      all.push({x,y,t});
    });
    const xs = all.map(p=>p.x), ys = all.map(p=>p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = 40;
    const scale = Math.min((rect.width - pad*2)/Math.max(1,maxX-minX||1),(rect.height-pad*2)/Math.max(1,maxY-minY||1));
    const sx = x => pad + (x - minX)*scale;
    const sy = y => rect.height - pad - (y - minY)*scale;
    all.forEach(p => {
      ctx.fillStyle = p.t.decayState === 'GREEN' ? '#96f0bf' : p.t.decayState === 'YELLOW' ? '#ffcf6b' : '#ff8f8f';
      ctx.beginPath();
      ctx.arc(sx(p.x), sy(p.y), 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eef4f9';
      ctx.font = '11px system-ui';
      ctx.fillText(p.t.callsign, sx(p.x)+8, sy(p.y)+4);
    });
  }catch(err){}
};

const __oldBuildExportPayload_v21 = buildExportPayload;
buildExportPayload = function(){
  const payload = __oldBuildExportPayload_v21();
  payload.afterAction = state.afterAction;
  payload.liveDecayClock = { running: state.liveDecayClock.running };
  return payload;
};

const __oldHydrate_v21 = hydrateFromPayload;
hydrateFromPayload = function(data){
  __oldHydrate_v21(data);
  if(data.afterAction) state.afterAction = data.afterAction;
  renderAfterActionBox();
  renderDecayClock();
  drawSignalMap();
};

const __oldClearMission_v21 = clearMission;
clearMission = function(){
  __oldClearMission_v21();
  stopLiveDecayClock();
  state.afterAction = { title:'', notes:'', generatedAt:null, body:'' };
  if(v21Refs.teamSignalLatInput) v21Refs.teamSignalLatInput.value = '';
  if(v21Refs.teamSignalLonInput) v21Refs.teamSignalLonInput.value = '';
  if(v21Refs.aarTitleInput) v21Refs.aarTitleInput.value = '';
  if(v21Refs.aarNotesInput) v21Refs.aarNotesInput.value = '';
  renderAfterActionBox();
  renderDecayClock();
};

initV21Layer();
renderDecayClock();
renderAfterActionBox();
drawSignalMap();


/* ===== v2.2 PACKET COORDS + SECTOR SHADING + RICH AAR ===== */
const v22Refs = {
  importGeoJsonInput: document.getElementById('importGeoJsonInput'),
  importGpxInput: document.getElementById('importGpxInput'),
  exportMappingBundleBtn: document.getElementById('exportMappingBundleBtn'),
  mappingTuningBox: document.getElementById('mappingTuningBox')
};

state.mappingBridge = {
  lastImportType: null,
  lastImportCount: 0,
  lastExportCount: 0
};

function initV22Layer(){
  if(v22Refs.importGeoJsonInput) v22Refs.importGeoJsonInput.onchange = importGeoJSONBridge;
  if(v22Refs.importGpxInput) v22Refs.importGpxInput.onchange = importGPXBridge;
  if(v22Refs.exportMappingBundleBtn) v22Refs.exportMappingBundleBtn.onclick = exportMappingBundle;
  renderMappingTuningBox();
}

function patchImportedPacketsForCoords(){
  const __oldImportPacketBundle_v22 = importPacketBundle;
  importPacketBundle = function(evt){
    __oldImportPacketBundle_v22(evt);
    try{
      const file = evt.target?.files?.[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try{
          const data = JSON.parse(reader.result);
          const packets = []
            .concat(Array.isArray(data.sent) ? data.sent : [])
            .concat(Array.isArray(data.queue) ? data.queue : []);
          let captured = 0;
          packets.forEach(p => {
            const payload = p && p.payload ? p.payload : {};
            const callsign = payload.callsign || payload.from || payload.unit || p.callsign;
            const gps = payload.gpsPoint || payload.position || null;
            if(callsign && gps && Number.isFinite(Number(gps.lat)) && Number.isFinite(Number(gps.lon))){
              upsertTeamSignalPosition(String(callsign), Number(gps.lat), Number(gps.lon), 'packet import');
              captured++;
            }
          });
          state.mappingBridge.lastImportType = 'packet_bundle';
          state.mappingBridge.lastImportCount = captured;
          renderMappingTuningBox();
          renderTeamSignalBoard();
          drawSignalMap();
        }catch(err){}
      };
      reader.readAsText(file);
    }catch(err){}
  };
}

function upsertTeamSignalPosition(callsign, lat, lon, note){
  const id = String(callsign || '').toUpperCase();
  if(!id) return;
  const idx = (state.teamSignals || []).findIndex(t => String(t.id || '').toUpperCase() === id);
  if(idx >= 0){
    state.teamSignals[idx].position = {lat, lon};
    if(note) state.teamSignals[idx].notes = state.teamSignals[idx].notes ? state.teamSignals[idx].notes + ' | ' + note : note;
  }else{
    const confidence = typeof computeTeamSignalConfidence === 'function' ? computeTeamSignalConfidence('unknown', id, 0) : {score:0.7,label:'MODERATE',cls:'conf-moderate'};
    const decay = typeof computeDecayState === 'function' ? computeDecayState(0, confidence.label) : {state:'YELLOW',cls:'decay-yellow',trend:'stable'};
    state.teamSignals.unshift({
      id,
      callsign,
      sourceType:'unknown',
      sourceId:id,
      lastSeenTs:new Date().toISOString(),
      confidenceScore:confidence.score,
      confidenceLabel:confidence.label,
      confidenceClass:confidence.cls,
      decayState:decay.state,
      decayClass:decay.cls,
      trend:decay.trend,
      notes:note || '',
      position:{lat, lon}
    });
  }
}

function importGeoJSONBridge(evt){
  const file = evt.target?.files?.[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      let count = 0;
      if(Array.isArray(data.features)){
        data.features.forEach(f => {
          if(f?.geometry?.type === 'Point' && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.length >= 2){
            const lon = Number(f.geometry.coordinates[0]);
            const lat = Number(f.geometry.coordinates[1]);
            const callsign = f.properties?.callsign || f.properties?.name || `IMPORTED-${count+1}`;
            if(Number.isFinite(lat) && Number.isFinite(lon)){
              upsertTeamSignalPosition(String(callsign), lat, lon, 'geojson import');
              count++;
            }
          }
        });
      }
      state.mappingBridge.lastImportType = 'geojson';
      state.mappingBridge.lastImportCount = count;
      renderMappingTuningBox();
      renderTeamSignalBoard();
      drawSignalMap();
    }catch(err){
      if(v22Refs.mappingTuningBox) v22Refs.mappingTuningBox.textContent = `GeoJSON import failed: ${err.message}`;
    }
    evt.target.value = '';
  };
  reader.readAsText(file);
}

defuse = None

function importGPXBridge(evt){
  const file = evt.target?.files?.[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const text = String(reader.result || '');
      const wptRegex = /<wpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>([\s\S]*?)<\/wpt>/g;
      let m, count = 0;
      while((m = wptRegex.exec(text)) !== null){
        const lat = Number(m[1]), lon = Number(m[2]);
        const inner = m[3] || '';
        const nameMatch = inner.match(/<name>([\s\S]*?)<\/name>/);
        const callsign = nameMatch ? nameMatch[1].replace(/<[^>]+>/g,'').trim() : `IMPORTED-${count+1}`;
        if(Number.isFinite(lat) && Number.isFinite(lon)){
          upsertTeamSignalPosition(String(callsign), lat, lon, 'gpx import');
          count++;
        }
      }
      state.mappingBridge.lastImportType = 'gpx';
      state.mappingBridge.lastImportCount = count;
      renderMappingTuningBox();
      renderTeamSignalBoard();
      drawSignalMap();
    }catch(err){
      if(v22Refs.mappingTuningBox) v22Refs.mappingTuningBox.textContent = `GPX import failed: ${err.message}`;
    }
    evt.target.value = '';
  };
  reader.readAsText(file);
}

function exportMappingBundle(){
  const features = [];
  (state.teamSignals || []).forEach(t => {
    if(t.position && Number.isFinite(t.position.lat) && Number.isFinite(t.position.lon)){
      features.push({
        type:'Feature',
        geometry:{type:'Point', coordinates:[t.position.lon, t.position.lat]},
        properties:{
          callsign:t.callsign,
          confidence:t.confidenceLabel,
          decayState:t.decayState,
          sourceType:t.sourceType
        }
      });
    }
  });
  const sectors = (state.sectors || []).map(s => ({
    id:s.id,
    status:s.status,
    assignedTo:s.assignedTo,
    priority:s.priority,
    note:s.note || ''
  }));
  const bundle = {
    exportedAt:new Date().toISOString(),
    features,
    sectors,
    trustGovernor: state.trustGovernor?.status || 'idle'
  };
  downloadBlob(JSON.stringify(bundle, null, 2), 'fieldscope-mapping-bundle.json', 'application/json');
  state.mappingBridge.lastExportCount = features.length;
  renderMappingTuningBox();
}

function renderMappingTuningBox(){
  if(!v22Refs.mappingTuningBox) return;
  v22Refs.mappingTuningBox.innerHTML =
    `<strong>MAPPING BRIDGE</strong><br>` +
    `Last import type: <strong>${state.mappingBridge.lastImportType || 'none'}</strong><br>` +
    `Last import count: <strong>${state.mappingBridge.lastImportCount || 0}</strong><br>` +
    `Last export feature count: <strong>${state.mappingBridge.lastExportCount || 0}</strong>`;
}

const __oldDrawSignalMap_v22 = drawSignalMap;
drawSignalMap = function(){
  __oldDrawSignalMap_v22();
  try{
    const canvas = refs.signalMap;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    // First-pass sector shading based on risk panel using left-bottom overlay strips
    const risks = typeof computeSectorRiskCoupling === 'function' ? computeSectorRiskCoupling().slice(0,5) : [];
    if(risks.length){
      const x = 14, y = rect.height - (risks.length * 18 + 18), w = 210, h = risks.length * 18 + 10;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.38)';
      ctx.fillRect(x-8, y-8, w, h);
      ctx.font = '11px system-ui';
      risks.forEach((r, i) => {
        const yy = y + i*18;
        const fill = (r.risk || 0) >= 2.5 ? 'rgba(255,143,143,.55)' : (r.risk || 0) >= 1.0 ? 'rgba(255,207,107,.50)' : 'rgba(150,240,191,.40)';
        ctx.fillStyle = fill;
        ctx.fillRect(x, yy, 14, 10);
        ctx.fillStyle = '#eef4f9';
        ctx.fillText(`${r.id} ${Number(r.risk || 0).toFixed(2)}`, x + 22, yy + 9);
      });
      ctx.restore();
    }
  }catch(err){}
};

const __oldGenerateAfterActionReport_v22 = generateAfterActionReport;
generateAfterActionReport = function(){
  __oldGenerateAfterActionReport_v22();
  try{
    const timeline = (state.signalEvents || []).slice(0,8).reverse();
    const queueTop = (state.packetQueue || []).slice(0,5).map(p => `${p.type} • ${p.ack_status}`).join('\n');
    const excerpt = timeline.map(e => `- ${e.time} | ${e.tag} | ${e.text}`).join('\n');
    state.afterAction.body += `\nTIMELINE EXCERPTS\n${excerpt || 'none'}\n\nQUEUE SNAPSHOT\n${queueTop || 'none'}\n`;
    renderAfterActionBox();
  }catch(err){}
};

const __oldBuildExportPayload_v22 = buildExportPayload;
buildExportPayload = function(){
  const payload = __oldBuildExportPayload_v22();
  payload.mappingBridge = state.mappingBridge;
  return payload;
};

const __oldHydrate_v22 = hydrateFromPayload;
hydrateFromPayload = function(data){
  __oldHydrate_v22(data);
  if(data.mappingBridge) state.mappingBridge = data.mappingBridge;
  renderMappingTuningBox();
};

const __oldClearMission_v22 = clearMission;
clearMission = function(){
  __oldClearMission_v22();
  state.mappingBridge = { lastImportType:null, lastImportCount:0, lastExportCount:0 };
  if(v22Refs.teamSignalLatInput) v22Refs.teamSignalLatInput.value = '';
  if(v22Refs.teamSignalLonInput) v22Refs.teamSignalLonInput.value = '';
  renderMappingTuningBox();
};

patchImportedPacketsForCoords();
initV22Layer();
renderMappingTuningBox();


/* ===== v2.3 POLYGON SHADING + TRUST AAR ===== */
const v23Refs = {
  sectorPolygonInput: document.getElementById('sectorPolygonInput'),
  applySectorPolygonBtn: document.getElementById('applySectorPolygonBtn'),
  polygonShadeBox: document.getElementById('polygonShadeBox')
};

function initV23Layer(){
  if(v23Refs.applySectorPolygonBtn) v23Refs.applySectorPolygonBtn.onclick = applySectorPolygonToCurrentSector;
  renderPolygonShadeBox();
}

function parseSectorPolygonInput(text){
  const lines = String(text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const pts = [];
  lines.forEach(line => {
    const parts = line.split(',').map(s => s.trim());
    if(parts.length >= 2){
      const lat = Number(parts[0]);
      const lon = Number(parts[1]);
      if(Number.isFinite(lat) && Number.isFinite(lon)){
        pts.push({lat, lon});
      }
    }
  });
  return pts;
}

function applySectorPolygonToCurrentSector(){
  const sectorId = (sectorRefs?.sectorIdInput?.value || '').trim();
  if(!sectorId){
    if(v23Refs.polygonShadeBox) v23Refs.polygonShadeBox.textContent = 'Set a Sector ID first, then apply polygon.';
    return;
  }
  const pts = parseSectorPolygonInput(v23Refs.sectorPolygonInput?.value || '');
  if(pts.length < 3){
    if(v23Refs.polygonShadeBox) v23Refs.polygonShadeBox.textContent = 'Need at least 3 valid polygon points.';
    return;
  }
  const idx = (state.sectors || []).findIndex(s => String(s.id || '').toLowerCase() == sectorId.toLowerCase());
  if(idx < 0){
    if(v23Refs.polygonShadeBox) v23Refs.polygonShadeBox.textContent = 'Sector not found. Add/update the sector first.';
    return;
  }
  state.sectors[idx].polygon = pts;
  renderPolygonShadeBox();
  try{ drawSignalMap(); }catch(err){}
}

function renderPolygonShadeBox(){
  if(!v23Refs.polygonShadeBox) return;
  const sectorId = (sectorRefs?.sectorIdInput?.value || '').trim();
  const sector = (state.sectors || []).find(s => String(s.id || '').toLowerCase() == sectorId.toLowerCase());
  const count = sector?.polygon?.length || 0;
  v23Refs.polygonShadeBox.innerHTML =
    `<strong>POLYGON SHADING</strong><br>` +
    `Target sector: <strong>${sectorId || 'none'}</strong><br>` +
    `Point count: <strong>${count}</strong>`;
}

const __oldDrawSignalMap_v23 = drawSignalMap;
drawSignalMap = function(){
  __oldDrawSignalMap_v23();
  try{
    const canvas = refs.signalMap;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    const sectors = (state.sectors || []).filter(s => Array.isArray(s.polygon) && s.polygon.length >= 3);
    if(!sectors.length || !(state.gpsPoints || []).length) return;

    const base = state.gpsPoints[0];
    const project = (lat, lon) => ({
      x: (lon - base.lon) * Math.cos(base.lat * Math.PI / 180) * 111320,
      y: (lat - base.lat) * 110540
    });

    const allPts = [];
    sectors.forEach(s => s.polygon.forEach(p => allPts.push(project(p.lat, p.lon))));
    if(!allPts.length) return;

    const xs = allPts.map(p => p.x), ys = allPts.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = 40;
    const scale = Math.min((rect.width - pad*2)/Math.max(1,maxX-minX||1),(rect.height-pad*2)/Math.max(1,maxY-minY||1));
    const sx = x => pad + (x - minX)*scale;
    const sy = y => rect.height - pad - (y - minY)*scale;

    sectors.forEach(s => {
      const riskRows = typeof computeSectorRiskCoupling === 'function' ? computeSectorRiskCoupling() : [];
      const risk = riskRows.find(r => r.id === s.id);
      const rv = Number(risk?.risk || 0);
      const fill = rv >= 2.5 ? 'rgba(255,143,143,.22)' : rv >= 1.0 ? 'rgba(255,207,107,.20)' : 'rgba(150,240,191,.18)';
      const stroke = rv >= 2.5 ? 'rgba(255,143,143,.80)' : rv >= 1.0 ? 'rgba(255,207,107,.80)' : 'rgba(150,240,191,.70)';
      ctx.save();
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      s.polygon.forEach((p, i) => {
        const pr = project(p.lat, p.lon);
        const x = sx(pr.x), y = sy(pr.y);
        if(i === 0) ctx.moveTo(x,y);
        else ctx.lineTo(x,y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const centroidX = s.polygon.reduce((a,p)=>a+p.lon,0) / s.polygon.length;
      const centroidY = s.polygon.reduce((a,p)=>a+p.lat,0) / s.polygon.length;
      const cpr = project(centroidY, centroidX);
      ctx.fillStyle = '#eef4f9';
      ctx.font = '11px system-ui';
      ctx.fillText(`${s.id} ${rv.toFixed(2)}`, sx(cpr.x)+4, sy(cpr.y)-4);
      ctx.restore();
    });
  }catch(err){}
};

const __oldGenerateAfterActionReport_v23 = generateAfterActionReport;
generateAfterActionReport = function(){
  __oldGenerateAfterActionReport_v23();
  try{
    const decisions = (state.trustGovernor?.decisions || []).slice(0,8);
    const excerpt = decisions.length
      ? decisions.map(d => `- ${String(d.type || '').replaceAll('_',' ')} | ${String(d.state || '').toUpperCase()} | ${d.text || ''}`).join('\n')
      : 'none';
    state.afterAction.body += `\nTRUST GOVERNOR EXCERPTS\n${excerpt}\n`;
    renderAfterActionBox();
  }catch(err){}
};

const __oldBuildExportPayload_v23 = buildExportPayload;
buildExportPayload = function(){
  const payload = __oldBuildExportPayload_v23();
  payload.sectorPolygons = (state.sectors || []).filter(s => Array.isArray(s.polygon) && s.polygon.length >= 3).map(s => ({
    id: s.id,
    polygon: s.polygon
  }));
  return payload;
};

const __oldHydrate_v23 = hydrateFromPayload;
hydrateFromPayload = function(data){
  __oldHydrate_v23(data);
  renderPolygonShadeBox();
  drawSignalMap();
};

const __oldClearMission_v23 = clearMission;
clearMission = function(){
  __oldClearMission_v23();
  if(v23Refs.sectorPolygonInput) v23Refs.sectorPolygonInput.value = '';
  renderPolygonShadeBox();
};

initV23Layer();
renderPolygonShadeBox();
drawSignalMap();


/* ===== v2.4 FIELD-HARDENING PASS ===== */
state.hardening = {
  stressView: false,
  doctrine: [
    'Assistive system only.',
    'Does not replace trained judgment.',
    'Does not replace issued radios, command systems, or official infrastructure.',
    'Primary systems first. FIELDSCOPE supports, bridges, and preserves continuity when things degrade.',
    'Weak trust must not produce false confidence.',
    'Use standard agency procedures first.'
  ],
  failureModes: [],
  normalization: []
};

const hardRefs = {
  doctrineBox: document.getElementById('doctrineBox'),
  failureModeBox: document.getElementById('failureModeBox'),
  failureBoard: document.getElementById('failureBoard'),
  runNormalizationBtn: document.getElementById('runNormalizationBtn'),
  normalizationBox: document.getElementById('normalizationBox'),
  toggleStressViewBtn: document.getElementById('toggleStressViewBtn'),
  stressViewBox: document.getElementById('stressViewBox')
};

function initFieldHardeningPass(){
  if(hardRefs.runNormalizationBtn) hardRefs.runNormalizationBtn.onclick = runNormalizationScan;
  if(hardRefs.toggleStressViewBtn) hardRefs.toggleStressViewBtn.onclick = toggleStressView;
  renderDoctrineBox();
  scanFailureModes();
  renderStressViewBox();
}

function renderDoctrineBox(){
  if(!hardRefs.doctrineBox) return;
  hardRefs.doctrineBox.innerHTML = `<strong>DOCTRINE</strong><br>` + state.hardening.doctrine.map(x => `• ${x}`).join('<br>');
}

function pushFailure(type, stateLabel, text){
  state.hardening.failureModes.push({type, state: stateLabel, text});
}

function scanFailureModes(){
  state.hardening.failureModes = [];
  const envAgeSec = state.environment?.updatedAt ? Math.max(0, Math.floor((Date.now() - new Date(state.environment.updatedAt).getTime())/1000)) : null;
  const redSignals = (state.teamSignals || []).filter(t => t.decayState === 'RED').length;
  const failedPackets = (state.failedPackets || []).length;
  const queued = (state.packetQueue || []).length;
  const blockedSources = (state.trustRegistry || []).filter(s => s.allowStatus === 'blocked').length;
  const trustStatus = state.trustGovernor?.status || 'idle';
  const radioPath = state.radioGateway?.radioPath || 'unavailable';
  const handshake = state.handshakeState?.phase || 'idle';

  if(envAgeSec == null) pushFailure('weather', 'warn', 'No environment snapshot loaded.');
  else if(envAgeSec > 1800) pushFailure('weather', 'bad', `Weather snapshot stale (${envAgeSec}s).`);
  else if(envAgeSec > 600) pushFailure('weather', 'warn', `Weather snapshot aging (${envAgeSec}s).`);
  else pushFailure('weather', 'good', 'Weather snapshot fresh enough.');

  if(redSignals > 0) pushFailure('team_signals', 'bad', `${redSignals} team signal(s) are RED / unreliable.`);
  else pushFailure('team_signals', 'good', 'No RED team signals present.');

  if(failedPackets > 0) pushFailure('packets', 'bad', `${failedPackets} packet(s) have failed.`);
  else if(queued > 10) pushFailure('packets', 'warn', `Queue depth high (${queued}).`);
  else pushFailure('packets', 'good', 'Packet state within expected range.');

  if(blockedSources > 0) pushFailure('trust_registry', 'warn', `${blockedSources} blocked source(s) exist in registry.`);
  else pushFailure('trust_registry', 'good', 'No blocked sources registered.');

  if(trustStatus === 'block') pushFailure('trust_governor', 'bad', 'Trust governor is blocking decisions.');
  else if(trustStatus === 'warn') pushFailure('trust_governor', 'warn', 'Trust governor is in caution state.');
  else pushFailure('trust_governor', 'good', 'Trust governor not actively blocking.');

  if(radioPath === 'unavailable') pushFailure('radio_path', 'warn', 'Radio path unavailable.');
  else pushFailure('radio_path', 'good', `Radio path ${radioPath}.`);

  if(handshake === 'degraded') pushFailure('handshake', 'bad', 'Adapter handshake degraded.');
  else if(handshake !== 'ready') pushFailure('handshake', 'warn', `Handshake not ready (${handshake}).`);
  else pushFailure('handshake', 'good', 'Handshake ready.');

  renderFailureModes();
}

function renderFailureModes(){
  if(!hardRefs.failureModeBox || !hardRefs.failureBoard) return;
  const failures = state.hardening.failureModes || [];
  const status = failures.some(f => f.state === 'bad') ? 'bad' : failures.some(f => f.state === 'warn') ? 'warn' : 'good';
  const cls = status === 'good' ? 'failure-good' : status === 'warn' ? 'failure-warn' : 'failure-bad';
  hardRefs.failureModeBox.className = `result-card small ${cls}`;
  hardRefs.failureModeBox.innerHTML =
    `<strong>FAILURE SCAN</strong><br>` +
    `Overall: <strong>${status.toUpperCase()}</strong><br>` +
    `Bad: <strong>${failures.filter(f => f.state === 'bad').length}</strong> • ` +
    `Warn: <strong>${failures.filter(f => f.state === 'warn').length}</strong> • ` +
    `Good: <strong>${failures.filter(f => f.state === 'good').length}</strong>`;

  hardRefs.failureBoard.innerHTML = '';
  failures.forEach(f => {
    const div = document.createElement('div');
    div.className = `timeline-item ${f.state === 'good' ? 'failure-good' : f.state === 'warn' ? 'failure-warn' : 'failure-bad'}`;
    div.innerHTML = `<div class="timeline-item-head"><strong>${f.type.replaceAll('_',' ')}</strong><span class="tag">${f.state.toUpperCase()}</span></div><div>${f.text}</div>`;
    hardRefs.failureBoard.appendChild(div);
  });
}

function runNormalizationScan(){
  const issues = [];
  let corrected = 0;

  (state.teamSignals || []).forEach(t => {
    if(t.position){
      const lat = Number(t.position.lat), lon = Number(t.position.lon);
      if(!Number.isFinite(lat) || !Number.isFinite(lon)){
        delete t.position;
        corrected += 1;
        issues.push(`Removed invalid position from ${t.callsign}.`);
      } else {
        t.position = {lat, lon};
      }
    }
    if(!t.id && t.callsign){
      t.id = String(t.callsign).toUpperCase();
      corrected += 1;
      issues.push(`Filled missing team signal ID for ${t.callsign}.`);
    }
  });

  (state.sectors || []).forEach(s => {
    if(typeof s.priority !== 'string'){
      s.priority = 'routine';
      corrected += 1;
      issues.push(`Normalized priority on sector ${s.id}.`);
    }
    if(s.polygon && Array.isArray(s.polygon)){
      const before = s.polygon.length;
      s.polygon = s.polygon
        .filter(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)))
        .map(p => ({lat:Number(p.lat), lon:Number(p.lon)}));
      if(s.polygon.length !== before){
        corrected += 1;
        issues.push(`Normalized polygon points on sector ${s.id}.`);
      }
    }
  });

  const deduped = [];
  const seen = new Set();
  (state.trustRegistry || []).forEach(item => {
    const key = String(item.sourceId || '').trim().toLowerCase();
    if(!key) return;
    if(seen.has(key)){
      corrected += 1;
      issues.push(`Removed duplicate trust source ${item.sourceId}.`);
      return;
    }
    seen.add(key);
    deduped.push(item);
  });
  state.trustRegistry = deduped;

  state.hardening.normalization = issues;
  if(!hardRefs.normalizationBox) return;
  hardRefs.normalizationBox.innerHTML =
    `<strong>NORMALIZATION</strong><br>` +
    `Corrections: <strong>${corrected}</strong><br>` +
    `${issues.length ? issues.map(x => `• ${x}`).join('<br>') : 'No normalization issues found.'}`;

  try{
    renderTeamSignalBoard();
    renderSectorBoard();
    renderTrustRegistryBoard();
    drawSignalMap();
    renderSectorRiskCoupling();
  }catch(err){}
}

function toggleStressView(){
  state.hardening.stressView = !state.hardening.stressView;
  document.body.classList.toggle('stress-view', state.hardening.stressView);
  renderStressViewBox();
}

function renderStressViewBox(){
  if(!hardRefs.stressViewBox) return;
  hardRefs.stressViewBox.innerHTML =
    `<strong>STRESS VIEW</strong><br>` +
    `State: <strong>${state.hardening.stressView ? 'ON' : 'OFF'}</strong><br>` +
    `${state.hardening.stressView ? 'Reduced clutter for high-pressure reading.' : 'Full interface visible.'}`;
}

const __oldHydrate_v24 = hydrateFromPayload;
hydrateFromPayload = function(data){
  __oldHydrate_v24(data);
  if(data.hardening) state.hardening = {...state.hardening, ...data.hardening};
  document.body.classList.toggle('stress-view', !!state.hardening.stressView);
  renderDoctrineBox();
  renderFailureModes();
  renderStressViewBox();
};

const __oldBuildExportPayload_v24 = buildExportPayload;
buildExportPayload = function(){
  const payload = __oldBuildExportPayload_v24();
  payload.hardening = {
    stressView: state.hardening.stressView,
    failureModes: state.hardening.failureModes,
    normalization: state.hardening.normalization
  };
  return payload;
};

const __oldClearMission_v24 = clearMission;
clearMission = function(){
  __oldClearMission_v24();
  state.hardening = {
    stressView: false,
    doctrine: [
      'Assistive system only.',
      'Does not replace trained judgment.',
      'Does not replace issued radios, command systems, or official infrastructure.',
      'Primary systems first. FIELDSCOPE supports, bridges, and preserves continuity when things degrade.',
      'Weak trust must not produce false confidence.',
      'Use standard agency procedures first.'
    ],
    failureModes: [],
    normalization: []
  };
  document.body.classList.remove('stress-view');
  renderDoctrineBox();
  scanFailureModes();
  if(hardRefs.normalizationBox) hardRefs.normalizationBox.textContent = 'No normalization scan yet.';
  renderStressViewBox();
};

const __oldRenderDecisionLockVisibility_v24 = renderDecisionLockVisibility;
renderDecisionLockVisibility = function(){
  __oldRenderDecisionLockVisibility_v24();
  try{ scanFailureModes(); }catch(err){}
};

const __oldRunHardTrustGovernor_v24 = runHardTrustGovernor;
runHardTrustGovernor = function(){
  __oldRunHardTrustGovernor_v24();
  try{ scanFailureModes(); }catch(err){}
};

initFieldHardeningPass();
renderDoctrineBox();
scanFailureModes();
renderStressViewBox();


/* ===== v2.5 DEMO MODE ===== */
state.demoMode = {
  running: false,
  stepIndex: -1,
  steps: []
};

const demoRefs = {
  startDemoBtn: document.getElementById('startDemoBtn'),
  nextDemoStepBtn: document.getElementById('nextDemoStepBtn'),
  exitDemoBtn: document.getElementById('exitDemoBtn'),
  demoOverlay: document.getElementById('demoOverlay'),
  demoTitle: document.getElementById('demoTitle'),
  demoBody: document.getElementById('demoBody'),
  demoStepReadout: document.getElementById('demoStepReadout'),
  demoModeReadout: document.getElementById('demoModeReadout')
};

function initDemoMode(){
  if(demoRefs.startDemoBtn) demoRefs.startDemoBtn.onclick = startDemoMode;
  if(demoRefs.nextDemoStepBtn) demoRefs.nextDemoStepBtn.onclick = nextDemoStep;
  if(demoRefs.exitDemoBtn) demoRefs.exitDemoBtn.onclick = () => exitDemoMode(false);
  buildDemoSteps();
  renderDemoIdle();
}

function buildDemoSteps(){
  state.demoMode.steps = [
    {title:'Clean Start', body:'Everything looks stable. Teams are green, trust is clean, weather is fresh, and the mission surface is calm.', focus:['gpsReadout','teamSignalBoard','truthBox','sectorRiskBox'], run: demoStepCleanStart},
    {title:'Signal Decay', body:'One team starts slipping. Confidence degrades over time, the map reflects it, and accountability pressure rises.', focus:['teamSignalBoard','signalMap','decisionLockMapBox'], run: demoStepSignalDecay},
    {title:'Weak Source / Bad Confirmation', body:'A new confirmation comes in, but it is weak and late. The trust system does not blindly accept it.', focus:['provBox','trustGovernorBox','failureModeBox'], run: demoStepWeakSource},
    {title:'Sector Risk Spike', body:'People-risk couples into sector-risk. A sector stops looking clean when the assigned team is no longer trustworthy.', focus:['sectorBoard','sectorRiskBox','signalMap'], run: demoStepSectorSpike},
    {title:'Decision Pressure', body:'Environment, trust, and accountability now constrain action. The system helps prevent a bad call.', focus:['exposureClockBox','trustDecisionBoard','failureBoard'], run: demoStepDecisionPressure},
    {title:'After Action', body:'The system closes the loop with a concise review packet showing timeline, trust decisions, and what degraded.', focus:['aarBox','failureBoard','truthBoard'], run: demoStepAfterAction}
  ];
}

function renderDemoIdle(){
  if(!demoRefs.demoTitle) return;
  demoRefs.demoTitle.textContent = 'Scenario';
  demoRefs.demoBody.textContent = 'Press START DEMO.';
  demoRefs.demoStepReadout.textContent = `Step 0 / ${state.demoMode.steps.length || 6}`;
  demoRefs.demoModeReadout.textContent = 'Guided demo ready';
}

function clearDemoFocus(){
  document.querySelectorAll('.demo-focus').forEach(el => el.classList.remove('demo-focus'));
  document.querySelectorAll('.panel, .topbar, .warning').forEach(el => el.classList.remove('dim-during-demo'));
}

function focusDemoTargets(ids){
  clearDemoFocus();
  if(!state.demoMode.running) return;
  const keep = new Set();
  ids.forEach(id => {
    const el = document.getElementById(id);
    if(el){
      el.classList.add('demo-focus');
      const panel = el.closest('.panel, .topbar, .warning');
      if(panel) keep.add(panel);
      keep.add(el);
    }
  });
  document.querySelectorAll('.panel, .topbar, .warning').forEach(el => {
    if(!keep.has(el)) el.classList.add('dim-during-demo');
  });
}

function showDemoOverlay(title, body, idx){
  demoRefs.demoOverlay?.classList.remove('hidden');
  demoRefs.demoTitle.textContent = title;
  demoRefs.demoBody.textContent = body;
  demoRefs.demoStepReadout.textContent = `Step ${idx + 1} / ${state.demoMode.steps.length}`;
  demoRefs.demoModeReadout.textContent = idx === state.demoMode.steps.length - 1 ? 'Final step' : 'Tap NEXT STEP to continue';
}

function startDemoMode(){
  exitDemoMode(true);
  state.demoMode.running = true;
  state.demoMode.stepIndex = -1;
  document.body.classList.add('demo-running');
  loadDemoBaseState();
  nextDemoStep();
}

function nextDemoStep(){
  if(!state.demoMode.running) return;
  state.demoMode.stepIndex += 1;
  if(state.demoMode.stepIndex >= state.demoMode.steps.length){
    exitDemoMode(false);
    return;
  }
  const step = state.demoMode.steps[state.demoMode.stepIndex];
  try{ step.run(); }catch(err){}
  focusDemoTargets(step.focus || []);
  showDemoOverlay(step.title, step.body, state.demoMode.stepIndex);
}

function exitDemoMode(silent){
  state.demoMode.running = false;
  state.demoMode.stepIndex = -1;
  document.body.classList.remove('demo-running');
  clearDemoFocus();
  demoRefs.demoOverlay?.classList.add('hidden');
  if(!silent) renderDemoIdle();
}

function makeDemoSignal(callsign, sourceType, sourceId, minutesAgo, note, position){
  const confidence = typeof computeTeamSignalConfidence === 'function'
    ? computeTeamSignalConfidence(sourceType, sourceId, minutesAgo)
    : {score:1.2, label:'HIGH', cls:'conf-high'};
  const decay = typeof computeDecayState === 'function'
    ? computeDecayState(minutesAgo, confidence.label)
    : {state:'GREEN', cls:'decay-green', trend:'stable'};
  return {
    id:String(callsign).toUpperCase(),
    callsign,
    sourceType,
    sourceId,
    lastSeenTs:new Date(Date.now()-minutesAgo*60000).toISOString(),
    confidenceScore:confidence.score,
    confidenceLabel:confidence.label,
    confidenceClass:confidence.cls,
    decayState:decay.state,
    decayClass:decay.cls,
    trend:decay.trend,
    notes:note,
    position
  };
}

function loadDemoBaseState(){
  try{ clearMission(); }catch(err){}
  state.callsign = 'BASE-OPS';
  if(refs.callsign) refs.callsign.value = state.callsign;
  state.role = 'lead';
  if(refs.roleSelect) refs.roleSelect.value = state.role;
  state.mode = 'sar';
  if(refs.modeSelect) refs.modeSelect.value = state.mode;
  state.subjectType = 'child';
  if(refs.subjectType) refs.subjectType.value = state.subjectType;
  state.lkp = 'Cedar Ridge Trailhead';
  if(refs.lkp) refs.lkp.value = state.lkp;
  state.elapsedHours = 2.25;
  if(refs.elapsedHours) refs.elapsedHours.value = String(state.elapsedHours);
  state.notes = 'Controlled demo scenario. Child subject. Mixed terrain. Partial comms.';
  if(refs.contextNotes) refs.contextNotes.value = state.notes;

  state.environment = {
    source:'demo',
    updatedAt:new Date().toISOString(),
    tempF:49,
    windMph:14,
    precip:'light',
    light:'dusk',
    summary:'49°F | Wind 14 mph | light'
  };
  try{ syncEnvironmentInputsFromState(); renderEnvironmentLayer(); }catch(err){}

  state.radioGateway.status = 'connected';
  state.radioGateway.route = 'radio_net';
  state.radioGateway.transport = 'ble';
  state.radioGateway.adapterId = 'RADIO-BRIDGE-01';
  state.radioGateway.radioProfile = 'vhf_team';
  state.radioGateway.batteryPct = 81;
  state.radioGateway.radioPath = 'available';
  if(typeof renderGatewayLayer === 'function') renderGatewayLayer();

  state.routeGovernor.defaultPolicy = 'auto';
  state.routeGovernor.congestionMode = 'protect_high_priority';
  state.routeGovernor.maxRadioPayload = 180;
  state.routeGovernor.dropThreshold = 12;
  if(typeof renderRouteGovernorBox === 'function') renderRouteGovernorBox();

  state.handshakeState.phase = 'ready';
  if(typeof renderHandshakeBox === 'function') renderHandshakeBox();

  state.gpsPoints = [
    {lat:32.754210, lon:-116.997430, acc:6, ts:new Date(Date.now()-300000).toISOString(), heading:68},
    {lat:32.754480, lon:-116.997060, acc:6, ts:new Date(Date.now()-180000).toISOString(), heading:71},
    {lat:32.754770, lon:-116.996700, acc:5, ts:new Date(Date.now()-60000).toISOString(), heading:75}
  ];
  if(refs.gpsReadout){
    const p = state.gpsPoints[state.gpsPoints.length-1];
    refs.gpsReadout.innerHTML = `Lat: <strong>${p.lat.toFixed(6)}</strong><br>Lon: <strong>${p.lon.toFixed(6)}</strong><br>Accuracy: <strong>±${Math.round(p.acc)}m</strong><br>Points: <strong>${state.gpsPoints.length}</strong>`;
  }

  state.sectors = [
    {id:'A-1', status:'active', assignedTo:'ALPHA-2', priority:'critical', note:'Drainage sweep', updatedAt:new Date().toISOString(), updatedBy:'BASE-OPS',
      polygon:[
        {lat:32.75410, lon:-116.99770},
        {lat:32.75465, lon:-116.99720},
        {lat:32.75420, lon:-116.99640},
        {lat:32.75370, lon:-116.99685}
      ]
    },
    {id:'B-2', status:'assigned', assignedTo:'BRAVO-1', priority:'elevated', note:'Ridgeline check', updatedAt:new Date().toISOString(), updatedBy:'BASE-OPS',
      polygon:[
        {lat:32.75470, lon:-116.99700},
        {lat:32.75515, lon:-116.99640},
        {lat:32.75475, lon:-116.99580},
        {lat:32.75435, lon:-116.99635}
      ]
    }
  ];
  if(typeof renderSectorBoard === 'function') renderSectorBoard();

  state.trustRegistry = [
    {sourceId:'COMMAND NODE', allowStatus:'allowed', trustClass:'high', sourceClass:'command', note:'Base command relay', updatedAt:new Date().toISOString()},
    {sourceId:'ALPHA-2', allowStatus:'allowed', trustClass:'high', sourceClass:'team', note:'Known field unit', updatedAt:new Date().toISOString()},
    {sourceId:'UNKNOWN RELAY', allowStatus:'restricted', trustClass:'low', sourceClass:'unknown', note:'Intermittent relay', updatedAt:new Date().toISOString()}
  ];
  if(typeof renderTrustRegistryBoard === 'function') renderTrustRegistryBoard();

  state.teamSignals = [
    makeDemoSignal('ALPHA-2','tracking','ALPHA-2',4,'tracking solid',{lat:32.75432, lon:-116.99718}),
    makeDemoSignal('BRAVO-1','radio_direct','BRAVO-1',2,'direct radio solid',{lat:32.75492, lon:-116.99628}),
    makeDemoSignal('CHARLIE-3','tracking','CHARLIE-3',6,'tracking stable',{lat:32.75400, lon:-116.99690})
  ];
  if(typeof renderTeamSignalBoard === 'function') renderTeamSignalBoard();

  state.signalEvents = [
    {time:new Date(Date.now()-240000).toLocaleTimeString(), tag:'scan', text:'possible human voice / whistle'},
    {time:new Date(Date.now()-180000).toLocaleTimeString(), tag:'gps', text:'GPS point • ±6m'},
    {time:new Date(Date.now()-120000).toLocaleTimeString(), tag:'fusion', text:'Fusion run • 3 scans • strengthening'}
  ];
  if(typeof renderSignalTimeline === 'function') renderSignalTimeline();

  if(typeof renderTruthHierarchy === 'function') renderTruthHierarchy();
  if(typeof scanFailureModes === 'function') scanFailureModes();
  if(typeof renderSectorRiskCoupling === 'function') renderSectorRiskCoupling();
  if(typeof renderDecisionLockVisibility === 'function') renderDecisionLockVisibility();
  if(typeof drawSignalMap === 'function') drawSignalMap();
  if(typeof refreshStatus === 'function') refreshStatus();
  if(typeof renderMovePacket === 'function') renderMovePacket();
}

function demoSetSignal(callsign, sourceType, sourceId, minutesAgo, note){
  const idx = (state.teamSignals || []).findIndex(t => String(t.id||'').toUpperCase() === String(callsign).toUpperCase());
  const prev = idx >= 0 ? state.teamSignals[idx] : {};
  const next = makeDemoSignal(callsign, sourceType, sourceId, minutesAgo, note, prev.position);
  if(idx >= 0) state.teamSignals[idx] = {...prev, ...next};
  else state.teamSignals.unshift(next);
  if(typeof renderTeamSignalBoard === 'function') renderTeamSignalBoard();
  if(typeof renderSectorRiskCoupling === 'function') renderSectorRiskCoupling();
  if(typeof renderDecisionLockVisibility === 'function') renderDecisionLockVisibility();
  if(typeof drawSignalMap === 'function') drawSignalMap();
}

function demoInjectAck(source, route, trust, latency){
  try{
    if(provRefs?.provSourceInput) provRefs.provSourceInput.value = source;
    if(provRefs?.provRouteSelect) provRefs.provRouteSelect.value = route;
    if(provRefs?.provTrustSelect) provRefs.provTrustSelect.value = trust;
    if(provRefs?.provLatencyInput) provRefs.provLatencyInput.value = String(latency);
    if(typeof injectAck === 'function') injectAck();
  }catch(err){}
}

function demoStepCleanStart(){
  loadDemoBaseState();
}

function demoStepSignalDecay(){
  demoSetSignal('BRAVO-1', 'radio_relay', 'BRAVO-1', 28, 'relay only, confidence degrading');
  if(typeof scanFailureModes === 'function') scanFailureModes();
}

function demoStepWeakSource(){
  demoInjectAck('UNKNOWN RELAY', 'radio_net', 'low', 74);
  if(typeof scanFailureModes === 'function') scanFailureModes();
}

function demoStepSectorSpike(){
  demoSetSignal('ALPHA-2', 'tracking', 'ALPHA-2', 53, 'tracking stale, accountability weak');
  if(typeof renderSectorRiskCoupling === 'function') renderSectorRiskCoupling();
  if(typeof renderTruthHierarchy === 'function') renderTruthHierarchy();
  if(typeof scanFailureModes === 'function') scanFailureModes();
}

function demoStepDecisionPressure(){
  state.elapsedHours = 4.5;
  if(refs.elapsedHours) refs.elapsedHours.value = String(state.elapsedHours);
  state.environment.tempF = 42;
  state.environment.windMph = 18;
  state.environment.precip = 'light';
  state.environment.light = 'night';
  state.environment.updatedAt = new Date().toISOString();
  state.environment.summary = '42°F | Wind 18 mph | light';
  try{ renderEnvironmentLayer(); }catch(err){}
  if(typeof runHardTrustGovernor === 'function') runHardTrustGovernor();
  if(typeof scanFailureModes === 'function') scanFailureModes();
  if(typeof renderMovePacket === 'function') renderMovePacket();
}

function demoStepAfterAction(){
  try{
    if(v21Refs?.aarTitleInput) v21Refs.aarTitleInput.value = 'Demo Mode · Controlled Review';
    if(v21Refs?.aarNotesInput) v21Refs.aarNotesInput.value = 'Demonstration of decay, weak source rejection, sector risk coupling, and trust-governed caution.';
    if(typeof generateAfterActionReport === 'function') generateAfterActionReport();
    if(typeof renderAfterActionBox === 'function') renderAfterActionBox();
  }catch(err){}
}

initDemoMode();
renderDemoIdle();


/* ===== RECOVERY v2.6 DEMO POLISH ===== */
(function(){
  if (!state.demoMode) return;
  state.demoMode.autoPlay = false;
  state.demoMode.autoTimer = null;
  state.demoMode.variant = 'lost_hiker';

  const autoPlayBtn = document.getElementById('autoPlayDemoBtn');
  const badDemoBtn = document.getElementById('badDemoBtn');
  const resetDemoBtn = document.getElementById('resetDemoStateBtn');
  const scenarioSelect = document.getElementById('demoScenarioSelect');

  function stopDemoTimers(){
    if(state.demoMode && state.demoMode.autoTimer){
      clearInterval(state.demoMode.autoTimer);
      state.demoMode.autoTimer = null;
    }
    if(state.demoMode) state.demoMode.autoPlay = false;
  }

  window.resetToCleanState = function(){
    try{ if (typeof exitDemoMode === 'function') exitDemoMode(true); }catch(err){}
    try{ if (typeof clearMission === 'function') clearMission(); }catch(err){}
    try{ if (typeof refreshStatus === 'function') refreshStatus(); }catch(err){}
    try{ if (typeof drawSignalMap === 'function') drawSignalMap(); }catch(err){}
    try{
      if (typeof renderDemoIdle === 'function') renderDemoIdle();
    }catch(err){}
  };

  window.startAutoPlayDemo = function(){
    stopDemoTimers();
    if (typeof startDemoMode === 'function') startDemoMode();
    state.demoMode.autoPlay = true;
    const demoModeReadout = document.getElementById('demoModeReadout');
    if (demoModeReadout) demoModeReadout.textContent = 'Auto-play running';
    state.demoMode.autoTimer = setInterval(() => {
      if(!state.demoMode.running){
        stopDemoTimers();
        return;
      }
      if(state.demoMode.stepIndex >= state.demoMode.steps.length - 1){
        stopDemoTimers();
        return;
      }
      if (typeof nextDemoStep === 'function') nextDemoStep();
    }, 5500);
  };

  window.startBadDemo = function(){
    stopDemoTimers();
    state.demoMode.running = true;
    state.demoMode.stepIndex = -1;
    document.body.classList.add('demo-running');
    try{ if (typeof loadDemoBaseState === 'function') loadDemoBaseState(); }catch(err){}

    try{ if (typeof demoSetSignal === 'function') demoSetSignal('ALPHA-2', 'tracking', 'ALPHA-2', 67, 'tracking stale, accountability weak'); }catch(err){}
    try{ if (typeof demoSetSignal === 'function') demoSetSignal('BRAVO-1', 'radio_relay', 'BRAVO-1', 38, 'relay only, confidence degrading'); }catch(err){}
    try{ if (typeof demoSetSignal === 'function') demoSetSignal('CHARLIE-3', 'unknown', 'UNKNOWN RELAY', 82, 'source weak, no reliable update'); }catch(err){}
    try{
      if (typeof provRefs !== 'undefined' && typeof injectAck === 'function'){
        if(provRefs.provSourceInput) provRefs.provSourceInput.value = 'UNKNOWN RELAY';
        if(provRefs.provRouteSelect) provRefs.provRouteSelect.value = 'radio_net';
        if(provRefs.provTrustSelect) provRefs.provTrustSelect.value = 'low';
        if(provRefs.provLatencyInput) provRefs.provLatencyInput.value = '96';
        injectAck();
      }
    }catch(err){}

    state.failedPackets = [{type:'short_message', ack_status:'failed'}, {type:'peer_state', ack_status:'failed'}];
    state.packetQueue = (state.packetQueue || []).concat([
      {id:'demo1', type:'peer_state', priority:4, ack_status:'queued', payload:{}},
      {id:'demo2', type:'scan_summary', priority:6, ack_status:'queued', payload:{}},
      {id:'demo3', type:'visual_summary', priority:7, ack_status:'queued', payload:{}}
    ]);

    try{
      state.environment.tempF = 39;
      state.environment.windMph = 24;
      state.environment.precip = 'light';
      state.environment.light = 'night';
      state.environment.updatedAt = new Date(Date.now() - 2400000).toISOString();
      state.environment.summary = '39°F | Wind 24 mph | light';
      if (refs && refs.elapsedHours) refs.elapsedHours.value = '5.5';
      state.elapsedHours = 5.5;
      if (typeof renderEnvironmentLayer === 'function') renderEnvironmentLayer();
    }catch(err){}

    try{ if (typeof runHardTrustGovernor === 'function') runHardTrustGovernor(); }catch(err){}
    try{ if (typeof scanFailureModes === 'function') scanFailureModes(); }catch(err){}
    try{ if (typeof renderTeamSignalBoard === 'function') renderTeamSignalBoard(); }catch(err){}
    try{ if (typeof renderSectorRiskCoupling === 'function') renderSectorRiskCoupling(); }catch(err){}
    try{ if (typeof renderMovePacket === 'function') renderMovePacket(); }catch(err){}
    try{ if (typeof drawSignalMap === 'function') drawSignalMap(); }catch(err){}

    try{
      if (typeof focusDemoTargets === 'function') focusDemoTargets(['failureModeBox','failureBoard','trustGovernorBox','sectorRiskBox','decisionLockMapBox']);
      const demoOverlay = document.getElementById('demoOverlay');
      const demoTitle = document.getElementById('demoTitle');
      const demoBody = document.getElementById('demoBody');
      const demoStepReadout = document.getElementById('demoStepReadout');
      const demoModeReadout = document.getElementById('demoModeReadout');
      if (demoOverlay) demoOverlay.classList.remove('hidden');
      if (demoTitle) demoTitle.textContent = 'Bad Demo · Failure Handling';
      if (demoBody) demoBody.textContent = 'This scenario intentionally goes ugly: stale weather, weak source, degraded accountability, failed packets, and rising exposure pressure. The point is to show that the system degrades honestly instead of faking confidence.';
      if (demoStepReadout) demoStepReadout.textContent = 'Stress Test';
      if (demoModeReadout) demoModeReadout.textContent = 'Use EXIT DEMO or RESET STATE when done';
    }catch(err){}
  };

  if (scenarioSelect){
    state.demoMode.variant = scenarioSelect.value || 'lost_hiker';
    scenarioSelect.addEventListener('change', () => {
      state.demoMode.variant = scenarioSelect.value || 'lost_hiker';
    });
  }

  if (typeof buildDemoSteps === 'function'){
    const __oldBuildDemoSteps_recovery = buildDemoSteps;
    buildDemoSteps = function(){
      __oldBuildDemoSteps_recovery();
      const variant = state.demoMode.variant || (scenarioSelect ? scenarioSelect.value : 'lost_hiker');
      if(variant === 'injured_climber'){
        state.demoMode.steps[0].body = 'Everything starts controlled, but terrain and injury context raise the stakes immediately.';
        state.demoMode.steps[1].body = 'One team starts slipping on a harder approach. Confidence decays while terrain risk stays high.';
        state.demoMode.steps[3].body = 'A climbing sector becomes hotter when accountability weakens and movement is restricted.';
        state.demoMode.steps[4].body = 'Cold exposure, injury pressure, and trust limits now constrain action harder.';
      }
    };
  }

  if (typeof loadDemoBaseState === 'function'){
    const __oldLoadDemoBaseState_recovery = loadDemoBaseState;
    loadDemoBaseState = function(){
      __oldLoadDemoBaseState_recovery();
      const variant = state.demoMode.variant || (scenarioSelect ? scenarioSelect.value : 'lost_hiker');
      if(variant === 'injured_climber'){
        state.subjectType = 'injured_adult';
        if(typeof refs !== 'undefined' && refs.subjectType) refs.subjectType.value = state.subjectType;
        state.lkp = 'Granite Face Access';
        if(typeof refs !== 'undefined' && refs.lkp) refs.lkp.value = state.lkp;
        state.elapsedHours = 1.5;
        if(typeof refs !== 'undefined' && refs.elapsedHours) refs.elapsedHours.value = String(state.elapsedHours);
        state.notes = 'Controlled demo scenario. Injured climber. Technical terrain. Partial comms.';
        if(typeof refs !== 'undefined' && refs.contextNotes) refs.contextNotes.value = state.notes;
        if(state.environment){
          state.environment.tempF = 44;
          state.environment.windMph = 20;
          state.environment.precip = 'none';
          state.environment.light = 'dusk';
          state.environment.summary = '44°F | Wind 20 mph | none';
          try{ if (typeof renderEnvironmentLayer === 'function') renderEnvironmentLayer(); }catch(err){}
        }
        state.sectors = [
          {id:'CLIFF-1', status:'active', assignedTo:'ALPHA-2', priority:'critical', note:'Rock face approach', updatedAt:new Date().toISOString(), updatedBy:'BASE-OPS',
            polygon:[
              {lat:32.75410, lon:-116.99755},
              {lat:32.75485, lon:-116.99705},
              {lat:32.75445, lon:-116.99615},
              {lat:32.75380, lon:-116.99660}
            ]
          },
          {id:'RIDGE-2', status:'assigned', assignedTo:'BRAVO-1', priority:'elevated', note:'Upper ridge handoff', updatedAt:new Date().toISOString(), updatedBy:'BASE-OPS',
            polygon:[
              {lat:32.75485, lon:-116.99705},
              {lat:32.75530, lon:-116.99630},
              {lat:32.75495, lon:-116.99575},
              {lat:32.75445, lon:-116.99615}
            ]
          }
        ];
        try{ if (typeof renderSectorBoard === 'function') renderSectorBoard(); }catch(err){}
        try{ if (typeof renderMovePacket === 'function') renderMovePacket(); }catch(err){}
        try{ if (typeof drawSignalMap === 'function') drawSignalMap(); }catch(err){}
      }
    };
  }

  if (autoPlayBtn) autoPlayBtn.addEventListener('click', window.startAutoPlayDemo);
  if (badDemoBtn) badDemoBtn.addEventListener('click', window.startBadDemo);
  if (resetDemoBtn) resetDemoBtn.addEventListener('click', window.resetToCleanState);

  if (typeof exitDemoMode === 'function'){
    const __oldExitDemoMode_recovery = exitDemoMode;
    exitDemoMode = function(silent){
      stopDemoTimers();
      __oldExitDemoMode_recovery(silent);
    };
  }
})();

/* ===== RECOVERY v2.7 TIME PRESSURE PANEL ===== */
(function(){
  state.timePressure = state.timePressure || { timer:null, running:false };
  const timePressureBox = document.getElementById('timePressureBox');

  function fmtDuration(ms){
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if(h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  }

  function getLastContactAgeMs(){
    const times = (state.teamSignals || [])
      .map(t => new Date(t.lastSeenTs).getTime())
      .filter(Number.isFinite);
    if(!times.length) return null;
    const newest = Math.max(...times);
    return Date.now() - newest;
  }

  function getExposureAgeMs(){
    const hours = Number(state.elapsedHours || 0);
    return Math.max(0, hours * 3600 * 1000);
  }

  function getWeatherAgeMs(){
    if(!state.environment || !state.environment.updatedAt) return null;
    const t = new Date(state.environment.updatedAt).getTime();
    if(!Number.isFinite(t)) return null;
    return Math.max(0, Date.now() - t);
  }

  function ageBand(ms, mode){
    if(ms == null) return {label:'NONE', cls:'tp-warn'};
    if(mode === 'last_contact'){
      if(ms < 10*60*1000) return {label:'GOOD', cls:'tp-good'};
      if(ms < 30*60*1000) return {label:'WATCH', cls:'tp-warn'};
      return {label:'BAD', cls:'tp-bad'};
    }
    if(mode === 'weather'){
      if(ms < 10*60*1000) return {label:'FRESH', cls:'tp-good'};
      if(ms < 45*60*1000) return {label:'AGING', cls:'tp-warn'};
      return {label:'STALE', cls:'tp-bad'};
    }
    if(mode === 'exposure'){
      if(ms < 2*3600*1000) return {label:'LOW', cls:'tp-good'};
      if(ms < 4*3600*1000) return {label:'RISING', cls:'tp-warn'};
      return {label:'HIGH', cls:'tp-bad'};
    }
    return {label:'WATCH', cls:'tp-warn'};
  }

  function computeTimePressureSummary(){
    const lastContactMs = getLastContactAgeMs();
    const exposureMs = getExposureAgeMs();
    const weatherMs = getWeatherAgeMs();
    const lc = ageBand(lastContactMs, 'last_contact');
    const ex = ageBand(exposureMs, 'exposure');
    const we = ageBand(weatherMs, 'weather');
    const labels = [lc.cls, ex.cls, we.cls];
    const overall = labels.includes('tp-bad') ? {label:'HIGH', cls:'tp-bad'}
      : labels.includes('tp-warn') ? {label:'RISING', cls:'tp-warn'}
      : {label:'CONTROLLED', cls:'tp-good'};
    return {lastContactMs, exposureMs, weatherMs, lc, ex, we, overall};
  }

  window.renderTimePressurePanel = function(){
    if(!timePressureBox) return;
    const s = computeTimePressureSummary();
    timePressureBox.className = `result-card small ${s.overall.cls}`;
    timePressureBox.innerHTML = `
      <strong>TIME PRESSURE</strong><br>
      Overall: <strong>${s.overall.label}</strong>
      <div class="time-pressure-grid">
        <div class="time-pressure-cell ${s.lc.cls}">
          <span>Last Contact</span>
          <strong>${s.lastContactMs == null ? 'none' : fmtDuration(s.lastContactMs)}</strong>
          <div>${s.lc.label}</div>
        </div>
        <div class="time-pressure-cell ${s.ex.cls}">
          <span>Exposure</span>
          <strong>${fmtDuration(s.exposureMs)}</strong>
          <div>${s.ex.label}</div>
        </div>
        <div class="time-pressure-cell ${s.we.cls}">
          <span>Weather Age</span>
          <strong>${s.weatherMs == null ? 'none' : fmtDuration(s.weatherMs)}</strong>
          <div>${s.we.label}</div>
        </div>
      </div>
    `;
  };

  function startTimePressureClock(){
    if(state.timePressure.timer) clearInterval(state.timePressure.timer);
    state.timePressure.running = true;
    state.timePressure.timer = setInterval(() => {
      try{ window.renderTimePressurePanel(); }catch(err){}
    }, 1000);
  }

  startTimePressureClock();
  window.renderTimePressurePanel();

  if (typeof buildExportPayload === 'function'){
    const __oldBuildExportPayload_recovery = buildExportPayload;
    buildExportPayload = function(){
      const payload = __oldBuildExportPayload_recovery();
      payload.timePressure = computeTimePressureSummary();
      return payload;
    };
  }

  if (typeof hydrateFromPayload === 'function'){
    const __oldHydrate_recovery = hydrateFromPayload;
    hydrateFromPayload = function(data){
      __oldHydrate_recovery(data);
      try{ window.renderTimePressurePanel(); }catch(err){}
    };
  }

  if (typeof clearMission === 'function'){
    const __oldClearMission_recovery = clearMission;
    clearMission = function(){
      __oldClearMission_recovery();
      try{ window.renderTimePressurePanel(); }catch(err){}
    };
  }
})();


/* ===== v2.8 GUIDED DEMO MODE ===== */
(function(){
  const prevBtn = document.getElementById('demoPrevBtn');
  const nextInlineBtn = document.getElementById('demoNextInlineBtn');
  const explainBox = document.getElementById('demoExplainBox');
  const modeReadout = document.getElementById('demoModeReadout');

  const guidedSteps = [
    {
      title:'Clean Start',
      body:'This is the calm baseline. Teams look healthy, sectors are assigned, trust is clean, and the weather snapshot is fresh enough to use.',
      explain:'The point of this step is to show the app when nothing is screaming. If the screen is always noisy, operators stop trusting it.',
      focus:['teamSignalBoard','sectorBoard','truthBox','timePressureBox']
    },
    {
      title:'Signal Decay',
      body:'Now one team starts degrading. The board changes, the map dot changes, and time pressure rises.',
      explain:'This is the first real value move: the system is not just showing a location, it is showing how much to trust that location over time.',
      focus:['teamSignalBoard','signalMap','timePressureBox','decisionLockMapBox']
    },
    {
      title:'Weak Source / Bad Confirmation',
      body:'A confirmation arrives, but it is weak and late. The trust layer refuses to treat it like clean truth.',
      explain:'This is the second big move: the app does not blindly accept every message. Provenance, route, trust, and latency all matter.',
      focus:['provBox','trustGovernorBox','failureModeBox','truthBoard']
    },
    {
      title:'Sector Risk Spike',
      body:'Sector risk rises because people-risk and accountability-risk now bleed into the sector itself.',
      explain:'This is where the system starts helping command thinking. A sector should not look clean if the team tied to it is going stale.',
      focus:['sectorRiskBox','sectorBoard','signalMap']
    },
    {
      title:'Decision Pressure',
      body:'Conditions worsen. Exposure time climbs, weather gets colder, and trust is no longer strong enough to justify overconfidence.',
      explain:'This step shows the app under pressure. Time, environment, trust, and accountability stack together and constrain action.',
      focus:['timePressureBox','exposureClockBox','trustDecisionBoard','failureBoard']
    },
    {
      title:'After Action',
      body:'The system closes the loop by summarizing what happened, what degraded, and what the trust layer warned about.',
      explain:'This matters because the tool should not only assist in the moment. It should also help teams review what they knew, when they knew it, and where uncertainty showed up.',
      focus:['aarBox','failureBoard','truthBoard']
    }
  ];

  function applyGuidedText(){
    const idx = state.demoMode?.stepIndex ?? -1;
    if(idx < 0 || idx >= guidedSteps.length) return;
    const g = guidedSteps[idx];
    if (demoRefs?.demoTitle) demoRefs.demoTitle.textContent = g.title;
    if (demoRefs?.demoBody) demoRefs.demoBody.textContent = g.body;
    if (explainBox) explainBox.innerHTML = `<strong>What you are seeing:</strong><br>${g.explain}`;
    if (modeReadout) modeReadout.textContent = idx === guidedSteps.length - 1 ? 'Final step · review the AAR' : 'Guided walkthrough · follow the highlighted panels';
    if (typeof focusDemoTargets === 'function') focusDemoTargets(g.focus || []);
  }

  function patchDemoLifecycle(){
    if (typeof startDemoMode === 'function'){
      const __oldStartDemoMode_v28 = startDemoMode;
      startDemoMode = function(){
        __oldStartDemoMode_v28();
        state.demoMode.stepIndex = 0;
        try{ guidedRunStep(0); }catch(err){}
      };
    }

    if (typeof nextDemoStep === 'function'){
      nextDemoStep = function(){
        if(!state.demoMode.running) return;
        const next = Math.min((state.demoMode.stepIndex ?? 0) + 1, guidedSteps.length - 1);
        state.demoMode.stepIndex = next;
        guidedRunStep(next);
      };
    }

    window.prevDemoStep = function(){
      if(!state.demoMode.running) return;
      const prev = Math.max((state.demoMode.stepIndex ?? 0) - 1, 0);
      state.demoMode.stepIndex = prev;
      guidedRunStep(prev);
    };

    if (typeof renderDemoIdle === 'function'){
      const __oldRenderDemoIdle_v28 = renderDemoIdle;
      renderDemoIdle = function(){
        __oldRenderDemoIdle_v28();
        if (explainBox) explainBox.textContent = 'Click GUIDED DEMO and the app will walk you through what changes, why it changes, and why it matters.';
        if (modeReadout) modeReadout.textContent = 'Guided walkthrough';
      };
    }
  }

  function guidedRunStep(idx){
    try{
      if(typeof loadDemoBaseState === 'function' && idx === 0) loadDemoBaseState();
      if(typeof demoStepSignalDecay === 'function' && idx === 1){ loadDemoBaseState(); demoStepSignalDecay(); }
      if(typeof demoStepWeakSource === 'function' && idx === 2){ loadDemoBaseState(); demoStepSignalDecay(); demoStepWeakSource(); }
      if(typeof demoStepSectorSpike === 'function' && idx === 3){ loadDemoBaseState(); demoStepSignalDecay(); demoStepWeakSource(); demoStepSectorSpike(); }
      if(typeof demoStepDecisionPressure === 'function' && idx === 4){ loadDemoBaseState(); demoStepSignalDecay(); demoStepWeakSource(); demoStepSectorSpike(); demoStepDecisionPressure(); }
      if(typeof demoStepAfterAction === 'function' && idx === 5){ loadDemoBaseState(); demoStepSignalDecay(); demoStepWeakSource(); demoStepSectorSpike(); demoStepDecisionPressure(); demoStepAfterAction(); }
    }catch(err){}
    if (demoRefs?.demoOverlay) demoRefs.demoOverlay.classList.remove('hidden');
    if (demoRefs?.demoStepReadout) demoRefs.demoStepReadout.textContent = `Step ${idx + 1} / ${guidedSteps.length}`;
    applyGuidedText();
  }

  if (prevBtn) prevBtn.addEventListener('click', () => window.prevDemoStep());
  if (nextInlineBtn) nextInlineBtn.addEventListener('click', () => {
    if(!state.demoMode.running){
      if(typeof startDemoMode === 'function') startDemoMode();
      return;
    }
    if((state.demoMode.stepIndex ?? 0) >= guidedSteps.length - 1){
      if(typeof exitDemoMode === 'function') exitDemoMode(false);
      return;
    }
    nextDemoStep();
  });

  if (typeof startAutoPlayDemo === 'function'){
    const __oldStartAutoPlayDemo_v28 = startAutoPlayDemo;
    startAutoPlayDemo = function(){
      __oldStartAutoPlayDemo_v28();
      if (explainBox) explainBox.innerHTML = '<strong>Auto-play:</strong><br>The system is walking through the scenario hands-free. Watch the highlighted panels for the value story.';
    };
  }

  patchDemoLifecycle();
  try{ if (typeof renderDemoIdle === 'function') renderDemoIdle(); }catch(err){}
})();


/* ===== v2.8.1 DEMO BINDING FIX + STICKY TIME ===== */
(function(){
  const stickyLast = document.getElementById('timeStickyLast');
  const stickyExposure = document.getElementById('timeStickyExposure');
  const stickyWeather = document.getElementById('timeStickyWeather');
  const stickyOverall = document.getElementById('timeStickyOverall');
  const stickyWrap = document.getElementById('timePressureSticky');

  function bindClick(id, fnName){
    const el = document.getElementById(id);
    if(!el) return;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener('click', (e) => {
      e.preventDefault();
      try{
        if(typeof window[fnName] === 'function') window[fnName]();
      }catch(err){
        console.error(`button ${id} failed`, err);
      }
    });
  }

  function bindGuidedButtons(){
    bindClick('startDemoBtn', 'startDemoMode');
    bindClick('autoPlayDemoBtn', 'startAutoPlayDemo');
    bindClick('nextDemoStepBtn', 'nextDemoStep');
    bindClick('badDemoBtn', 'startBadDemo');
    bindClick('resetDemoStateBtn', 'resetToCleanState');
    bindClick('exitDemoBtn', 'exitDemoModePublic');
    bindClick('demoPrevBtn', 'prevDemoStep');
    bindClick('demoNextInlineBtn', 'guidedNextStep');
  }

  window.exitDemoModePublic = function(){
    if(typeof exitDemoMode === 'function') exitDemoMode(false);
  };

  window.guidedNextStep = function(){
    if(!state.demoMode || !state.demoMode.running){
      if(typeof startDemoMode === 'function') startDemoMode();
      return;
    }
    if((state.demoMode.stepIndex ?? 0) >= ((state.demoMode.steps || []).length - 1)){
      if(typeof exitDemoMode === 'function') exitDemoMode(false);
      return;
    }
    if(typeof nextDemoStep === 'function') nextDemoStep();
  };

  const oldRender = window.renderTimePressurePanel;
  window.renderTimePressurePanel = function(){
    if(typeof oldRender === 'function') oldRender();
    try{
      const summary = (typeof computeTimePressureSummary === 'function') ? computeTimePressureSummary() : null;
      if(!summary) return;
      if(stickyLast) stickyLast.textContent = summary.lastContactMs == null ? 'none' : fmtDuration(summary.lastContactMs);
      if(stickyExposure) stickyExposure.textContent = fmtDuration(summary.exposureMs);
      if(stickyWeather) stickyWeather.textContent = summary.weatherMs == null ? 'none' : fmtDuration(summary.weatherMs);
      if(stickyOverall) stickyOverall.textContent = summary.overall.label;
      if(stickyWrap) stickyWrap.className = `time-pressure-sticky ${summary.overall.cls}`;
    }catch(err){}
  };

  // Rebind after all previous patches have loaded
  bindGuidedButtons();
  try{ if(typeof window.renderTimePressurePanel === 'function') window.renderTimePressurePanel(); }catch(err){}
})();
