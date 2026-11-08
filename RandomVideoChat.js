import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { mediaDevices, RTCPeerConnection, RTCView } from "react-native-webrtc";

const ICE = [{ urls: "stun:stun.l.google.com:19302" }]; // Canlı yayında TURN bilgisi güvenli sunucudan eklenmelidir.
const theme = { bg:"#07162D", card:"#102747", gold:"#36B9FF", white:"#F4F9FF", muted:"#A8BED8", red:"#F16B78" };

// Random 1:1 video matching. Requires an authenticated Supabase client and deployed migration.
export default function RandomVideoChat({ supabase, userId, onExit, isAdult }) {
  const [status,setStatus] = useState("idle");
  const [call,setCall] = useState(null);
  const [remoteStream,setRemoteStream] = useState(null);
  const [localStream,setLocalStream] = useState(null);
  const [muted,setMuted] = useState(false);
  const [cameraOff,setCameraOff] = useState(false);
  const [seconds,setSeconds] = useState(0);
  const pc = useRef(null), channel = useRef(null), poll = useRef(null), activeCall = useRef(null), localStreamRef = useRef(null), seen = useRef(new Set());

  useEffect(()=>{ activeCall.current=call; },[call]);
  useEffect(()=>{ if(status!=="connected") return; const t=setInterval(()=>setSeconds(s=>s+1),1000); return ()=>clearInterval(t); },[status]);

  const stopMedia = async () => {
    try { if(pc.current){pc.current.close();pc.current=null;} } catch(e){}
    try { localStreamRef.current?.getTracks?.().forEach(t=>t.stop()); } catch(e){}
    localStreamRef.current=null; setLocalStream(null); setRemoteStream(null);
    if(channel.current){ await supabase.removeChannel(channel.current); channel.current=null; }
    if(poll.current){clearInterval(poll.current);poll.current=null;}
  };
  const sendSignal = async (kind,payload) => {
    if(!activeCall.current) return;
    const {error}=await supabase.from("sohvia_video_signals").insert({
      call_id:activeCall.current.id, sender_id:userId, signal_type:kind, payload
    });
    if(error) throw error;
  };
  const handleSignal = async row => {
    if(!row || row.sender_id===userId || seen.current.has(row.id) || !pc.current) return;
    seen.current.add(row.id);
    try {
      if(row.signal_type==="offer" && !pc.current.remoteDescription){
        await pc.current.setRemoteDescription(row.payload);
        const answer=await pc.current.createAnswer(); await pc.current.setLocalDescription(answer);
        await sendSignal("answer",pc.current.localDescription.toJSON ? pc.current.localDescription.toJSON() : pc.current.localDescription);
      } else if(row.signal_type==="answer" && !pc.current.remoteDescription){
        await pc.current.setRemoteDescription(row.payload);
      } else if(row.signal_type==="ice" && row.payload){
        await pc.current.addIceCandidate(row.payload);
      } else if(row.signal_type==="hangup"){
        await finish("other");
      }
    } catch(e){ console.warn("video signal",e); }
  };
  const startPeer = async (session, initiator, stream) => {
    const peer=new RTCPeerConnection({iceServers:ICE}); pc.current=peer;
    stream.getTracks().forEach(t=>peer.addTrack(t,stream));
    peer.ontrack=e=>{ if(e.streams?.[0]) setRemoteStream(e.streams[0]); };
    peer.onicecandidate=e=>{ if(e.candidate) sendSignal("ice",e.candidate.toJSON ? e.candidate.toJSON() : e.candidate).catch(()=>{}); };
    peer.onconnectionstatechange=()=>{ if(["failed","disconnected","closed"].includes(peer.connectionState)) setStatus(s=>s==="connected"?"reconnecting":s); };
    const ch=supabase.channel("video-"+session.id);
    channel.current=ch;
    ch.on("postgres_changes",{event:"INSERT",schema:"public",table:"sohvia_video_signals",filter:"call_id=eq."+session.id},payload=>handleSignal(payload.new));
    await ch.subscribe();
    const {data:oldSignals}=await supabase.from("sohvia_video_signals").select("*").eq("call_id",session.id).order("created_at");
    for(const row of oldSignals||[]) await handleSignal(row);
    if(initiator){
      const offer=await peer.createOffer(); await peer.setLocalDescription(offer);
      await sendSignal("offer",peer.localDescription.toJSON ? peer.localDescription.toJSON() : peer.localDescription);
    }
  };
  const findMatch = async () => {
    if(!isAdult){ Alert.alert("18+ gerekli","Rastgele görüntülü sohbet yalnızca 18 yaş ve üzeri kullanıcılar içindir."); return; }
    if(!userId){Alert.alert("Giriş gerekli","Görüntülü sohbet için hesabına giriş yapmalısın.");return;}
    setStatus("searching"); setSeconds(0); seen.current.clear();
    try {
      const stream=await mediaDevices.getUserMedia({audio:true,video:{facingMode:"user",width:640,height:480,frameRate:24}});
      localStreamRef.current=stream; setLocalStream(stream);
      const attempt=async()=>{
        const {data,error}=await supabase.rpc("sohvia_video_match_random");
        if(error) throw error;
        if(data?.waiting || !data?.call_id) return false;
        if(poll.current){clearInterval(poll.current);poll.current=null;}
        const session={id:data.call_id,initiator:!!data.is_initiator}; setCall(session); activeCall.current=session;
        await startPeer(session,session.initiator,stream);
        setStatus("connected"); return true;
      };
      const matched=await attempt();
      if(!matched){
        poll.current=setInterval(async()=>{
          try { if(status==="idle") return; await attempt(); }
          catch(e){ if(poll.current){clearInterval(poll.current);poll.current=null;} await stopMedia(); setStatus("idle"); Alert.alert("Eşleşme",e.message||"Eşleşme başarısız."); }
        },3000);
      }
    } catch(e){ await stopMedia(); setCall(null); setStatus("idle"); Alert.alert("Görüntülü sohbet",e.message||"Kamera veya bağlantı başlatılamadı."); }
  };
  const finish = async (reason="user") => {
    const current=activeCall.current;
    try { if(current && reason==="user") await sendSignal("hangup",{}); } catch(e){}
    try { if(current) await supabase.rpc("sohvia_video_end_call",{p_call_id:current.id}); else await supabase.rpc("sohvia_video_leave_queue"); } catch(e){}
    await stopMedia(); setCall(null); activeCall.current=null; setStatus("idle"); setSeconds(0);
  };
  const reportCurrent = async (reason) => {
    const current=activeCall.current; if(!current) return;
    try {
      const {data:members,error}=await supabase.from("sohvia_video_call_members").select("user_id").eq("call_id",current.id);
      if(error) throw error;
      const other=(members||[]).find(m=>m.user_id!==userId)?.user_id;
      if(!other) throw new Error("Karşı kullanıcı bulunamadı.");
      const {error:reportError}=await supabase.rpc("sohvia_video_report_user",{p_reported_user_id:other,p_call_id:current.id,p_reason:reason,p_details:"Rastgele görüntülü sohbet bildirimi"});
      if(reportError) throw reportError;
      Alert.alert("Bildirimin alındı","SOHVIA ekibine iletildi. Teşekkür ederiz.");
      await finish();
    } catch(e){ Alert.alert("Bildirim gönderilemedi",e.message||"Tekrar dene."); }
  };
  const blockCurrent = async () => {
    const current=activeCall.current; if(!current) return;
    try {
      const {data:members,error}=await supabase.from("sohvia_video_call_members").select("user_id").eq("call_id",current.id);
      if(error) throw error;
      const other=(members||[]).find(m=>m.user_id!==userId)?.user_id;
      if(!other) throw new Error("Karşı kullanıcı bulunamadı.");
      const {error:blockError}=await supabase.rpc("sohvia_video_block_user",{p_blocked_user_id:other});
      if(blockError) throw blockError;
      Alert.alert("Kullanıcı engellendi","Bu hesapla tekrar eşleştirilmeyeceksin.");
      await finish();
    } catch(e){ Alert.alert("Engellenemedi",e.message||"Tekrar dene."); }
  };
  const safetyMenu = () => Alert.alert("Güvenlik", "Bu görüşmeyle ilgili ne yapmak istersin?", [
    {text:"Taciz / uygunsuz davranış bildir",onPress:()=>Alert.alert("Şikâyet nedeni","Uygun nedeni seç.",[
      {text:"Taciz veya tehdit",onPress:()=>reportCurrent("harassment")},
      {text:"Cinsel içerik",onPress:()=>reportCurrent("sexual_content")},
      {text:"Sahte hesap / dolandırıcılık",onPress:()=>reportCurrent("fake_or_scam")},
      {text:"Diğer",onPress:()=>reportCurrent("other")}, {text:"Vazgeç",style:"cancel"}
    ])},
    {text:"Kullanıcıyı engelle",style:"destructive",onPress:blockCurrent},
    {text:"İptal",style:"cancel"}
  ]);
  const next = async () => { await finish(); await findMatch(); };
  const toggleMic=()=>{ const nextValue=!muted; localStream?.getAudioTracks().forEach(t=>t.enabled=!nextValue); setMuted(nextValue); };
  const toggleCamera=()=>{ const nextValue=!cameraOff; localStream?.getVideoTracks().forEach(t=>t.enabled=!nextValue); setCameraOff(nextValue); };
  useEffect(()=>()=>{ stopMedia(); },[]);
  const time=`${Math.floor(seconds/60).toString().padStart(2,"0")}:${(seconds%60).toString().padStart(2,"0")}`;
  return <View style={s.root}>
    <Text style={s.brand}>♛ SOHVIA</Text><Text style={s.title}>Rastgele Görüntülü Sohbet</Text>
    <View style={s.videoBox}>
      {remoteStream ? <RTCView streamURL={remoteStream.toURL()} style={s.remote} objectFit="cover"/> : <View style={s.wait}><Text style={s.big}>✦</Text><Text style={s.waitText}>{status==="searching"?"Sana uygun biri aranıyor…":"Yeni insanlarla tanış"}</Text><Text style={s.small}>Güvenli ve saygılı sohbet et</Text></View>}
      {localStream && <RTCView streamURL={localStream.toURL()} style={s.local} objectFit="cover" mirror/>}
      <Text style={s.timer}>{status==="connected"?time:status==="searching"?"EŞLEŞME ARANIYOR":"SOHVIA"}</Text>
    </View>
    <View style={s.controls}>
      <TouchableOpacity style={s.control} onPress={toggleMic} disabled={!localStream}><Text style={s.controlText}>{muted?"🔇":"🎙️"}{"\n"}Mikrofon</Text></TouchableOpacity>
      <TouchableOpacity style={s.control} onPress={toggleCamera} disabled={!localStream}><Text style={s.controlText}>{cameraOff?"🚫":"📷"}{"\n"}Kamera</Text></TouchableOpacity>
      <TouchableOpacity style={[s.control,s.end]} onPress={()=>finish()}><Text style={s.controlText}>☎️{"\n"}Bitir</Text></TouchableOpacity>
    </View>
    {status==="idle" ? <TouchableOpacity style={s.primary} onPress={findMatch}><Text style={s.primaryText}>Rastgele Kişi Bul</Text></TouchableOpacity> :
      status==="connected" ? <TouchableOpacity style={s.primary} onPress={next}><Text style={s.primaryText}>Sonraki Kişi →</Text></TouchableOpacity> :
      <TouchableOpacity style={s.primary} onPress={()=>finish()}><Text style={s.primaryText}>Aramayı İptal Et</Text></TouchableOpacity>}
    {status==="connected" && <TouchableOpacity style={s.safety} onPress={safetyMenu}><Text style={s.safetyText}>⚑ Şikâyet et veya engelle</Text></TouchableOpacity>}
    <Text style={s.note}>18+ • Yaş kontrolü sunucuda yapılır. Görüşmeler kaydedilmez. İstediğin an ayrılabilir, şikâyet edebilir veya engelleyebilirsin.</Text>
    <TouchableOpacity onPress={onExit} style={s.back}><Text style={s.small}>← Geri dön</Text></TouchableOpacity>
  </View>;
}
const s=StyleSheet.create({
 root:{flex:1,backgroundColor:theme.bg,padding:16,paddingTop:30},brand:{color:theme.gold,fontSize:20,fontWeight:"900",textAlign:"center"},title:{color:theme.white,fontSize:20,fontWeight:"800",textAlign:"center",marginVertical:14},
 videoBox:{flex:1,minHeight:330,maxHeight:540,backgroundColor:"#061124",borderRadius:24,overflow:"hidden",borderWidth:1,borderColor:"#168BFF",justifyContent:"center",alignItems:"center"},
 remote:{width:"100%",height:"100%"},wait:{alignItems:"center"},big:{fontSize:52,color:theme.gold},waitText:{color:theme.white,fontSize:18,fontWeight:"700",marginTop:8},small:{color:theme.muted,fontSize:12},local:{position:"absolute",right:12,bottom:12,width:104,height:142,borderRadius:14,borderWidth:1,borderColor:theme.gold},timer:{position:"absolute",top:12,left:12,color:theme.white,backgroundColor:"#0009",padding:7,borderRadius:8,fontWeight:"700"},
 controls:{flexDirection:"row",justifyContent:"space-around",marginVertical:16},control:{backgroundColor:theme.card,padding:12,borderRadius:16,minWidth:82,alignItems:"center"},controlText:{color:theme.white,textAlign:"center",fontWeight:"700",lineHeight:22},end:{backgroundColor:"#6E2432"},primary:{backgroundColor:"#087BEE",padding:16,borderRadius:16,alignItems:"center",borderWidth:1,borderColor:"#54CFFF"},primaryText:{color:"#FFFFFF",fontWeight:"900",fontSize:16},note:{color:theme.muted,fontSize:11,textAlign:"center",marginTop:12,lineHeight:16},safety:{alignItems:"center",padding:12,marginTop:10,borderWidth:1,borderColor:"#B64A66",borderRadius:14,backgroundColor:"#321B32"},safetyText:{color:"#FFD7E1",fontWeight:"800"},back:{alignItems:"center",padding:10}
});
