import ChessOnline from "./ChessOnline";
import RandomVideoChat from "./RandomVideoChat";
import "react-native-url-polyfill/auto";
import React, { useEffect, useState } from "react";
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Image, Modal, Linking, StatusBar
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zlvprzlfamcfdkuxlzsi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_FTwiIyA0r7VQMeXOSQSp-Q_nvJYXEnZ";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
});

const C = { bg:"#07162D", card:"#102747", gold:"#36B9FF", white:"#F4F9FF", muted:"#A8BED8", line:"#244A75", blue:"#168BFF", green:"#42D9A0" };
const GAME_META = {
  "okey-101": { emoji:"🀄", subtitle:"Taşını diz, 101'i aç, masayı kazan", accent:"#E9B65D", tag:"ÇOK OYUNCULU", players:"4 oyuncu", art:"101" },
  "tavla": { emoji:"🎲", subtitle:"Zarını at, pullarını topla", accent:"#D89A63", tag:"KLASİK", players:"2 oyuncu", art:"♟" },
  "chess": { emoji:"♟️", subtitle:"Stratejini konuştur", accent:"#86B8FF", tag:"STRATEJİ", players:"2 oyuncu", art:"♛" },
  "default": { emoji:"🎮", subtitle:"Arkadaşlarınla oyna", accent:"#B69BFF", tag:"SOHVIA OYUNU", players:"Çok oyunculu", art:"✦" }
};
function gameMeta(game){ return GAME_META[game.slug] || GAME_META.default; }

function Btn({title,onPress,secondary=false}) {
  return <TouchableOpacity onPress={onPress} style={[styles.btn, secondary && styles.btnSecondary]}>
    <Text style={[styles.btnText, secondary && {color:C.gold}]}>{title}</Text>
  </TouchableOpacity>;
}
function Field(props) {
  return <TextInput placeholderTextColor={C.muted} style={styles.field} {...props}/>;
}

export default function App() {
  const [session,setSession] = useState(null);
  const [onlineChess,setOnlineChess] = useState(false);
  const [randomVideo,setRandomVideo] = useState(false);
  const [loading,setLoading] = useState(true);
  const [mode,setMode] = useState("login");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [username,setUsername] = useState("");
  const [displayName,setDisplayName] = useState("");
  const [tab,setTab] = useState("Ana Sayfa");
  const [profile,setProfile] = useState(null);
  const [games,setGames] = useState([]);
  const [people,setPeople] = useState([]);
  const [messages,setMessages] = useState([]);
  const [target,setTarget] = useState(null);
  const [message,setMessage] = useState("");
  const [wallet,setWallet] = useState(null);
  const [busy,setBusy] = useState(false);
  const [posts,setPosts] = useState([]);
  const [postDraft,setPostDraft] = useState("");
  const [commentDrafts,setCommentDrafts] = useState({});
  const [stories,setStories] = useState([]);
  const [avatarUrl,setAvatarUrl] = useState(null);
  const [bioDraft,setBioDraft] = useState("");
  const [uploading,setUploading] = useState(false);
  const [selectedStory,setSelectedStory] = useState(null);
  const [isAdmin,setIsAdmin] = useState(false);
  const [adminUsers,setAdminUsers] = useState([]);
  const [adminReports,setAdminReports] = useState([]);
  const [adminSearch,setAdminSearch] = useState("");
  const [adminTarget,setAdminTarget] = useState(null);
  const [adminCoins,setAdminCoins] = useState("0");
  const [adminReason,setAdminReason] = useState("");
  const [newPassword,setNewPassword] = useState("");
  const [selectedGame,setSelectedGame] = useState(null);
  const [gameRoom,setGameRoom] = useState(null);
  const [roomPlayers,setRoomPlayers] = useState([]);
  const [joinCode,setJoinCode] = useState("");
  const [roomBusy,setRoomBusy] = useState(false);
  const [myTiles,setMyTiles] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({data}) => {
      setSession(data.session);
      setLoading(false);
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) loadAppData();
    else { setProfile(null); setPeople([]); setMessages([]); setWallet(null); }
  }, [session?.user?.id]);

  async function ensureProfile(user) {
    const {data,error} = await supabase.from("profiles").select("*").eq("id",user.id).maybeSingle();
    if (error) throw error;
    if (data) return data;
    const metadataName = (user.user_metadata?.username || "").toLowerCase();
    const fallback = (user.email || "uye").split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g,"").slice(0,19);
    const candidate = /^[a-z0-9_]{5,24}$/.test(metadataName) ? metadataName : fallback;
    const safeUsername = (candidate.length >= 5 ? candidate : "uye_" + user.id.slice(0,8)).slice(0,24);
    const {data:created,error:insertError} = await supabase.from("profiles").insert({
      id:user.id, username:safeUsername, display_name:user.user_metadata?.display_name || safeUsername
    }).select().single();
    if (insertError) throw insertError;
    return created;
  }

  async function loadAppData() {
    try {
      const user = session.user;
      const statusResult = await supabase.rpc("sohvia_account_status");
      if (statusResult.error) throw statusResult.error;
      const accountStatus = statusResult.data?.[0];
      if (accountStatus?.is_banned) {
        Alert.alert("Hesap engellendi", accountStatus.ban_reason || "Bu hesap yönetici tarafından geçici olarak engellendi.");
        await supabase.auth.signOut();
        return;
      }
      const adminResult = await supabase.rpc("sohvia_is_admin");
      if (adminResult.error) throw adminResult.error;
      setIsAdmin(!!adminResult.data);
      const p = await ensureProfile(user);
      setProfile(p);
      setBioDraft(p.bio || "");
      setAvatarUrl(p.avatar_path ? supabase.storage.from("sohvia-media").getPublicUrl(p.avatar_path).data.publicUrl : null);
      const [g,w,others] = await Promise.all([
        supabase.from("game_catalog").select("*").eq("is_active",true).order("title"),
        supabase.from("user_wallets").select("*").eq("user_id",user.id).maybeSingle(),
        supabase.from("profiles").select("id,username,display_name,avatar_path").neq("id",user.id).limit(40)
      ]);
      if (g.error) throw g.error;
      if (w.error) throw w.error;
      if (others.error) throw others.error;
      setGames(g.data || []);
      setWallet(w.data);
      setPeople(others.data || []);
      await loadSocialData();
      if (adminResult.data) await loadAdminData();
    } catch(e) {
      Alert.alert("Veri yüklenemedi", e.message || "Lütfen tekrar dene.");
    }
  }


  async function refreshRoom(roomId) {
    const [r,p] = await Promise.all([
      supabase.from("sohvia_game_rooms").select("*").eq("id",roomId).single(),
      supabase.from("sohvia_game_room_players").select("user_id,seat_no,is_ready,joined_at").eq("room_id",roomId).order("seat_no")
    ]);
    if (r.error) throw r.error;
    if (p.error) throw p.error;
    setGameRoom(r.data); setRoomPlayers(p.data || []);
    if (r.data.game_slug === "okey-101" && r.data.status === "playing" && session?.user?.id) {
      const h = await supabase.from("sohvia_game_player_hands").select("tiles").eq("room_id",roomId).eq("user_id",session.user.id).maybeSingle();
      if (!h.error) setMyTiles(h.data?.tiles || []);
    } else setMyTiles([]);
  }
  async function openGame(game) {
    if (game.slug === "chess") { setOnlineChess(true); return; }
    if (game.slug !== "okey-101") {
      Alert.alert("Bu oyun hazırlanıyor", `${game.title} için oynanabilir ekran henüz tamamlanmadı.`);
      return;
    }
    await createGameRoom(game);
  }

  async function createGameRoom(game) {
    try {
      setRoomBusy(true); setSelectedGame(game);
      const {data,error} = await supabase.rpc("sohvia_create_game_room",{p_game_slug:game.slug,p_max_players:game.slug==="okey-101"?4:2});
      if (error) throw error;
      await refreshRoom(data.id);
    } catch(e) { Alert.alert("Oda açılamadı",e.message || "Tekrar dene."); }
    finally { setRoomBusy(false); }
  }
  async function joinGameRoom() {
    try {
      if (!joinCode.trim()) { Alert.alert("Oda kodu", "Arkadaşının verdiği oda kodunu yaz."); return; }
      setRoomBusy(true);
      const {data,error} = await supabase.rpc("sohvia_join_game_room",{p_room_code:joinCode.trim()});
      if (error) throw error;
      const game = games.find(g=>g.slug===data.game_slug) || {slug:data.game_slug,title:data.game_slug};
      setSelectedGame(game); await refreshRoom(data.id);
    } catch(e) { Alert.alert("Odaya katılınamadı",e.message || "Oda kodunu kontrol et."); }
    finally { setRoomBusy(false); }
  }
  async function start101Game() {
    if (!gameRoom?.id) return;
    try { setRoomBusy(true); const {error} = await supabase.rpc("sohvia_start_101_game",{p_room_id:gameRoom.id}); if (error) throw error; await refreshRoom(gameRoom.id); }
    catch(e) { Alert.alert("Oyun başlatılamadı",e.message || "Tekrar dene."); } finally { setRoomBusy(false); }
  }
  async function leaveGameRoom() {
    if (!gameRoom) return;
    try { await supabase.rpc("sohvia_leave_game_room",{p_room_id:gameRoom.id}); }
    catch(e) { Alert.alert("Hata",e.message); }
    setGameRoom(null); setRoomPlayers([]); setSelectedGame(null);
  }
  useEffect(()=>{
    if (!gameRoom?.id) return;
    const ch = supabase.channel("sohvia-room-"+gameRoom.id)
      .on("postgres_changes",{event:"*",schema:"public",table:"sohvia_game_rooms",filter:"id=eq."+gameRoom.id},()=>refreshRoom(gameRoom.id))
      .on("postgres_changes",{event:"*",schema:"public",table:"sohvia_game_room_players",filter:"room_id=eq."+gameRoom.id},()=>refreshRoom(gameRoom.id))
      .on("postgres_changes",{event:"*",schema:"public",table:"sohvia_game_player_hands",filter:"room_id=eq."+gameRoom.id},()=>refreshRoom(gameRoom.id))
      .subscribe();
    return ()=>{supabase.removeChannel(ch);};
  },[gameRoom?.id]);

  async function loadSocialData() {
    const [p,s] = await Promise.all([
      supabase.from("posts").select("id,user_id,body,created_at,profiles(username,display_name),post_likes(user_id),post_comments(id,body,user_id,created_at)").order("created_at",{ascending:false}).limit(50),
      supabase.from("stories").select("id,user_id,media_path,media_type,caption,created_at,expires_at,profiles(username)").gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(50)
    ]);
    if (p.error) throw p.error;
    if (s.error) throw s.error;
    setPosts(p.data || []); setStories(s.data || []);
  }
  async function chooseAndUpload(kind) {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { Alert.alert("İzin gerekli", "Fotoğraf ve videolarını seçebilmek için galeri izni vermelisin."); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: kind === "story" ? ["images", "videos"] : ["images"],
        allowsEditing: kind === "avatar",
        aspect: kind === "avatar" ? [1,1] : undefined,
        quality: 0.82,
        base64: true
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) throw new Error("Görsel okunamadı. Tekrar seç.");
      setUploading(true);
      const ext = (asset.fileName || asset.uri.split("?")[0]).split(".").pop()?.toLowerCase() || (asset.type === "video" ? "mp4" : "jpg");
      const mime = asset.mimeType || (asset.type === "video" ? "video/mp4" : "image/jpeg");
      const bytes = Uint8Array.from(atob(asset.base64), c => c.charCodeAt(0));
      const path = `${session.user.id}/${kind}_${Date.now()}.${ext}`;
      const {error:uploadError} = await supabase.storage.from("sohvia-media").upload(path, bytes, {contentType:mime, upsert:false});
      if (uploadError) throw uploadError;
      if (kind === "avatar") {
        const {data,error} = await supabase.from("profiles").update({avatar_path:path}).eq("id",session.user.id).select().single();
        if (error) throw error;
        setProfile(data);
        setAvatarUrl(supabase.storage.from("sohvia-media").getPublicUrl(path).data.publicUrl);
        Alert.alert("Tamam", "Profil fotoğrafın güncellendi.");
      } else {
        const {error} = await supabase.from("stories").insert({user_id:session.user.id,media_path:path,media_type:asset.type === "video" ? "video" : "image",caption:""});
        if (error) throw error;
        await loadSocialData();
        Alert.alert("Paylaşıldı", "Hikâyen 24 saat boyunca yayında kalacak.");
      }
    } catch(e) { Alert.alert("Yükleme başarısız", e.message || "Tekrar dene."); }
    finally { setUploading(false); }
  }


  async function loadAdminData(search=adminSearch) {
    const [u,r] = await Promise.all([
      supabase.rpc("sohvia_admin_list_users", {p_search:search}),
      supabase.rpc("sohvia_admin_reports")
    ]);
    if (u.error) throw u.error;
    if (r.error) throw r.error;
    setAdminUsers(u.data || []); setAdminReports(r.data || []);
  }
  async function adminBan(user, banned) {
    try {
      const {error}=await supabase.rpc("sohvia_admin_set_ban",{p_user_id:user.user_id,p_banned:banned,p_reason:adminReason,p_until:null});
      if(error) throw error;
      Alert.alert("Tamam",banned?"Kullanıcı engellendi.":"Kullanıcının engeli kaldırıldı.");
      await loadAdminData();
    } catch(e) { Alert.alert("Yönetici işlemi başarısız",e.message); }
  }
  async function adminSetCoins() {
    if(!adminTarget) return Alert.alert("Kullanıcı seç","Önce bir kullanıcı seç.");
    const amount=Number(adminCoins);
    if(!Number.isFinite(amount)||amount<0) return Alert.alert("Geçersiz miktar","0 veya daha büyük bir jeton bakiyesi yaz.");
    try { const {error}=await supabase.rpc("sohvia_admin_set_coins",{p_user_id:adminTarget.user_id,p_amount:amount,p_note:"Yönetici paneli"}); if(error)throw error; Alert.alert("Tamam","Jeton bakiyesi güncellendi."); await loadAdminData(); }
    catch(e){Alert.alert("İşlem başarısız",e.message);}
  }
  async function adminSetEntitlement(membership,blueTick,tier) {
    if(!adminTarget) return Alert.alert("Kullanıcı seç","Önce bir kullanıcı seç.");
    try { const {error}=await supabase.rpc("sohvia_admin_set_entitlement",{p_user_id:adminTarget.user_id,p_membership:membership,p_blue_tick:blueTick,p_blue_tick_tier:tier}); if(error)throw error; Alert.alert("Tamam","Üyelik ve mavi tik ayarlandı."); await loadAdminData(); }
    catch(e){Alert.alert("İşlem başarısız",e.message);}
  }
  async function adminReportStatus(id,status) {
    try {const {error}=await supabase.rpc("sohvia_admin_update_report",{p_report_id:id,p_status:status});if(error)throw error;await loadAdminData();}
    catch(e){Alert.alert("Rapor güncellenemedi",e.message);}
  }
  async function changePassword() {
    if(newPassword.length<12) return Alert.alert("Şifre zayıf","En az 12 karakterli yeni bir şifre belirle.");
    const {error}=await supabase.auth.updateUser({password:newPassword});
    if(error) Alert.alert("Şifre değiştirilemedi",error.message);
    else {setNewPassword("");Alert.alert("Şifre güncellendi","Yeni şifren kaydedildi.");}
  }

  async function saveBio() {
    const bio = bioDraft.trim();
    if (bio.length > 160) { Alert.alert("Çok uzun", "Biyografi en fazla 160 karakter olabilir."); return; }
    const {data,error} = await supabase.from("profiles").update({bio}).eq("id",session.user.id).select().single();
    if (error) { Alert.alert("Profil güncellenemedi", error.message); return; }
    setProfile(data);
    Alert.alert("Kaydedildi", "Biyografin güncellendi.");
  }

  async function publishPost() {
    const body=postDraft.trim(); if(!body) return;
    const {error}=await supabase.from("posts").insert({user_id:session.user.id,body,media_type:"none"});
    if(error){Alert.alert("Paylaşım yapılamadı",error.message);return;}
    setPostDraft(""); await loadSocialData();
  }
  async function toggleLike(post) {
    const liked=(post.post_likes||[]).some(x=>x.user_id===session.user.id);
    const q=liked ? supabase.from("post_likes").delete().eq("post_id",post.id).eq("user_id",session.user.id) : supabase.from("post_likes").insert({post_id:post.id,user_id:session.user.id});
    const {error}=await q; if(error) Alert.alert("Beğeni işlemi başarısız",error.message); else await loadSocialData();
  }
  async function addComment(post) {
    const body=(commentDrafts[post.id]||"").trim(); if(!body) return;
    const {error}=await supabase.from("post_comments").insert({post_id:post.id,user_id:session.user.id,body});
    if(error){Alert.alert("Yorum gönderilemedi",error.message);return;}
    setCommentDrafts(v=>({...v,[post.id]:""})); await loadSocialData();
  }

  async function authAction() {
    if (!email.trim() || password.length < 6) {
      Alert.alert("Bilgi gerekli","E-posta ve en az 6 karakterli şifre gir.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const uname = username.trim().toLowerCase();
        if (!/^[a-z0-9_]{5,24}$/.test(uname)) throw new Error("Kullanıcı adı 5-24 karakter olmalı; küçük harf, rakam ve _ kullan.");
        const {data,error} = await supabase.auth.signUp({
          email:email.trim(), password,
          options:{data:{username:uname,display_name:displayName.trim() || uname}}
        });
        if (error) throw error;
        if (data.session) {
          const {error:profileError} = await supabase.from("profiles").insert({
            id:data.user.id, username:uname, display_name:displayName.trim() || uname
          });
          if (profileError) throw profileError;
          Alert.alert("Hoş geldin","SOHVIA hesabın oluşturuldu.");
        } else {
          Alert.alert("E-postanı kontrol et","Kayıt isteği gönderildi. E-posta doğrulaması gerekiyorsa onayladıktan sonra giriş yap.");
          setMode("login");
        }
      } else {
        const {error} = await supabase.auth.signInWithPassword({email:email.trim(),password});
        if (error) throw error;
      }
    } catch(e) { Alert.alert("İşlem başarısız",e.message || "Tekrar dene."); }
    finally { setBusy(false); }
  }

  async function sendFriendRequest(person) {
    try {
      const {error} = await supabase.from("friend_requests").insert({sender_id:session.user.id,receiver_id:person.id});
      if (error) throw error;
      Alert.alert("Gönderildi",person.username + " kullanıcısına arkadaşlık isteği gönderildi.");
    } catch(e) { Alert.alert("İstek gönderilemedi",e.message); }
  }

  async function openChat(person) {
    setTarget(person);
    setTab("Sohbet");
    await loadMessages(person);
  }
  async function loadMessages(person=target) {
    if (!person) return;
    const uid=session.user.id;
    const {data,error}=await supabase.from("messages").select("*")
      .or(`and(sender_id.eq.${uid},receiver_id.eq.${person.id}),and(sender_id.eq.${person.id},receiver_id.eq.${uid})`)
      .order("created_at",{ascending:true}).limit(100);
    if (error) { Alert.alert("Mesajlar alınamadı",error.message); return; }
    setMessages(data || []);
  }
  useEffect(() => {
    if (!target?.id || !session?.user?.id) return;
    const channel = supabase.channel(`sohvia-chat-${session.user.id}-${target.id}`)
      .on("postgres_changes", {event:"INSERT", schema:"public", table:"messages"}, payload => {
        const row = payload.new;
        const belongs = (row.sender_id === session.user.id && row.receiver_id === target.id) ||
          (row.sender_id === target.id && row.receiver_id === session.user.id);
        if (belongs) loadMessages(target);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [target?.id, session?.user?.id]);

  async function sendMessage() {
    if (!message.trim() || !target) return;
    const body=message.trim(); setMessage("");
    const {error}=await supabase.from("messages").insert({
      sender_id:session.user.id, receiver_id:target.id, body
    });
    if (error) { setMessage(body); Alert.alert("Mesaj gönderilemedi",error.message); }
    else loadMessages(target);
  }

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator color={C.gold}/><Text style={styles.muted}>SOHVIA açılıyor…</Text></SafeAreaView>;

  if (!session) return (
    <SafeAreaView style={styles.container}>
      <StatusBarShim/>
      <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined} style={styles.authWrap}>
        <View style={styles.brandMark}><Text style={styles.brandCrown}>♛</Text><Text style={styles.logo}>S</Text></View>
        <Text style={styles.brandName}>SOHVIA</Text>
        <Text style={styles.subtitle}>Bağlan • Paylaş • Oyna</Text>
        <View style={styles.trustLine}><Text style={styles.trustText}>✦ Güvenli topluluk  ·  Gerçek bağlantılar</Text></View>
        <Text style={styles.heading}>{mode==="login"?"Tekrar hoş geldin":"SOHVIA'ya katıl"}</Text>
        {mode==="signup" && <>
          <Field placeholder="Kullanıcı adı (5-24 karakter)" value={username} onChangeText={setUsername} autoCapitalize="none"/>
          <Field placeholder="Görünen ad" value={displayName} onChangeText={setDisplayName}/>
        </>}
        <Field placeholder="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"/>
        <Field placeholder="Şifre (en az 6 karakter)" value={password} onChangeText={setPassword} secureTextEntry/>
        <Btn title={busy?"Bekle…":mode==="login"?"Giriş yap":"Ücretsiz hesap oluştur"} onPress={authAction}/>
        <Btn secondary title={mode==="login"?"Hesabın yok mu? Kayıt ol":"Zaten hesabın var mı? Giriş yap"} onPress={()=>setMode(mode==="login"?"signup":"login")}/>
        <Text style={styles.note}>E-posta doğrulaması kapalıysa kayıt sonrası doğrudan giriş yapabilirsin.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  if (onlineChess) return <SafeAreaView style={styles.container}><ChessOnline supabase={supabase} userId={session.user.id} onExit={()=>setOnlineChess(false)}/></SafeAreaView>;

  if (randomVideo) return <SafeAreaView style={styles.container}><RandomVideoChat supabase={supabase} userId={session.user.id} isAdult={true} onExit={()=>setRandomVideo(false)}/></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBarShim/>
      <View style={styles.header}>
        <View><Text style={styles.logoSmall}>👑 SOHVIA</Text><Text style={styles.muted}>Bağlan • Paylaş • Oyna</Text></View>
        <Text style={styles.coins}>🪙 {wallet?.coin_balance ?? 0}</Text>
      </View>
      <ScrollView style={styles.body} contentContainerStyle={{paddingBottom:28}}>
        {tab==="Ana Sayfa" && <>
          <View style={styles.hero}><Text style={styles.kicker}>SOHVIA'YA HOŞ GELDİN</Text><Text style={styles.heroTitle}>Burada herkesin bir yeri var. ✨</Text><Text style={styles.muted}>Arkadaşlarını keşfet, oyunlara katıl ve paylaş.</Text></View>
          <TouchableOpacity style={styles.videoLaunch} onPress={()=>setRandomVideo(true)}><Text style={styles.videoLaunchIcon}>📹</Text><View style={{flex:1}}><Text style={styles.videoLaunchTitle}>Rastgele Görüntülü Sohbet</Text><Text style={styles.muted}>18+ doğrulamasıyla yeni insanlarla tanış</Text></View><Text style={styles.videoLaunchArrow}>→</Text></TouchableOpacity>
          <Text style={styles.section}>Hikâyeler · 24 saat</Text>
          <Btn title={uploading?"Yükleniyor…":"＋ Fotoğraf / video hikâyesi ekle"} onPress={()=>chooseAndUpload("story")} secondary/>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:14}}>{stories.map(st=><TouchableOpacity key={st.id} style={styles.storyPill} onPress={()=>setSelectedStory(st)}><Text style={styles.gold}>◉ @{st.profiles?.username || "üye"}</Text><Text style={styles.muted}>{st.media_type === "video" ? "▶ Video hikâyesi" : "▣ Fotoğraf hikâyesi"}</Text></TouchableOpacity>)}{stories.length===0&&<Text style={styles.muted}>Henüz aktif hikâye yok.</Text>}</ScrollView>
          <Text style={styles.section}>Bir şey paylaş</Text>
          <Field placeholder="Bugün ne paylaşmak istersin?" value={postDraft} onChangeText={setPostDraft} multiline/>
          <Btn title="Gönderiyi paylaş" onPress={publishPost}/>
          <Text style={styles.section}>Topluluk akışı</Text>
          {posts.map(post=><View key={post.id} style={styles.postCard}>
            <Text style={styles.cardTitle}>{post.profiles?.display_name || post.profiles?.username || "SOHVIA üyesi"}</Text>
            <Text style={styles.muted}>@{post.profiles?.username || "uye"}</Text>
            <Text style={styles.postBody}>{post.body}</Text>
            <TouchableOpacity onPress={()=>toggleLike(post)}><Text style={styles.gold}>♥ {(post.post_likes||[]).length} · Beğen</Text></TouchableOpacity>
            {(post.post_comments||[]).map(c=><Text key={c.id} style={styles.commentText}>💬 {c.body}</Text>)}
            <View style={styles.compose}><TextInput style={styles.messageInput} placeholder="Yorum yaz…" placeholderTextColor={C.muted} value={commentDrafts[post.id]||""} onChangeText={v=>setCommentDrafts(old=>({...old,[post.id]:v}))}/><TouchableOpacity onPress={()=>addComment(post)}><Text style={styles.gold}>Yorumla</Text></TouchableOpacity></View>
          </View>)}
          <View style={styles.gamesPromo}><Text style={styles.gamesEyebrow}>SOHVIA ARCADE</Text><Text style={styles.gamesPromoTitle}>Oyunun keyfi, arkadaşlarınla güzel.</Text><Text style={styles.muted}>Bir oyun seç, oda kur ve arkadaşını davet et.</Text><View style={styles.gamesStats}><Text style={styles.gamesStat}>✦ Özel odalar</Text><Text style={styles.gamesStat}>⌁ Canlı eşleşme altyapısı</Text></View></View>
          <Text style={styles.section}>Öne çıkan oyunlar</Text>
          {games.map(game=>{const meta=gameMeta(game);return <TouchableOpacity key={game.slug} activeOpacity={0.88} style={[styles.gameTile,{borderColor:meta.accent+"88"}]} onPress={()=>openGame(game)} disabled={roomBusy}>
            <View style={[styles.gameArt,{backgroundColor:meta.accent+"20",borderColor:meta.accent+"66"}]}><Text style={{fontSize:42}}>{meta.emoji}</Text><Text style={[styles.gameArtMark,{color:meta.accent}]}>{meta.art}</Text></View>
            <View style={{flex:1}}><Text style={[styles.gameTag,{color:meta.accent}]}>{meta.tag}</Text><Text style={styles.gameName}>{game.title}</Text><Text style={styles.muted}>{meta.subtitle}</Text><Text style={styles.gamePlayers}>♙ {game.min_players||2}–{game.max_players||meta.players} oyuncu</Text></View>
            <View style={[styles.playPill,{backgroundColor:meta.accent}]}><Text style={styles.playPillText}>OYNA ›</Text></View>
          </TouchableOpacity>})}
        </>}
        {tab==="Keşfet" && <>
          <Text style={styles.heading}>İnsanları keşfet</Text>
          {people.map(person=><View key={person.id} style={styles.rowCard}><Text style={styles.avatar}>👤</Text><View style={{flex:1}}><Text style={styles.cardTitle}>{person.display_name || person.username}</Text><Text style={styles.muted}>@{person.username}</Text></View><TouchableOpacity onPress={()=>sendFriendRequest(person)}><Text style={styles.gold}>+ Ekle</Text></TouchableOpacity><TouchableOpacity onPress={()=>openChat(person)}><Text style={styles.gold}>  Mesaj</Text></TouchableOpacity></View>)}
        </>}
        {tab==="Oyunlar" && <>
          <Text style={styles.heading}>Oyun Merkezi 🎮</Text>
          <Btn title="♟ Çevrim içi Satranç oyna" onPress={()=>setOnlineChess(true)}/>
          {gameRoom ? <View style={styles.postCard}>
            <View style={styles.tableHeader}><Text style={styles.gameTag}>SOHVIA PRIVATE TABLE</Text><Text style={styles.cardTitle}>{selectedGame?.title || "SOHVIA Oyunu"} · Oyun Odası</Text></View>
            <Text style={styles.muted}>Arkadaşına bu kodu gönder:</Text>
            <Text style={[styles.heroTitle,{textAlign:"center",color:C.gold,letterSpacing:5}]}>{gameRoom.room_code}</Text>
            <Text style={styles.muted}>Oyuncular ({roomPlayers.length}/{gameRoom.max_players})</Text>
            {roomPlayers.map((pl)=><Text key={pl.user_id} style={styles.commentText}>🪑 Koltuk {pl.seat_no} · {pl.user_id===session.user.id?"Sen":"Oyuncu "+pl.user_id.slice(0,6)}</Text>)}
            <Text style={styles.muted}>{gameRoom.status==="waiting"?"Arkadaşların katılınca burada görünecek.":"Oyun durumu: "+gameRoom.status}</Text>
            {gameRoom.game_slug==="okey-101" && gameRoom.status==="waiting" && gameRoom.host_user_id===session.user.id && <Btn title={roomBusy?"Başlatılıyor…":"101 Okey'i başlat (4 oyuncu)"} onPress={start101Game}/>}
            {gameRoom.game_slug==="okey-101" && gameRoom.status==="playing" && <View style={styles.okeyTable}><Text style={styles.okeyTableTitle}>101 OKEY · MASA</Text><View style={styles.okeyCenter}><Text style={styles.okeyCenterEmoji}>🀄</Text><Text style={styles.okeyCenterText}>SOHVIA OKEY MASASI</Text><Text style={styles.muted}>Taşların sana özel olarak dağıtıldı</Text></View><Text style={styles.cardTitle}>ELİN ({myTiles.length} TAŞ)</Text><View style={styles.tileRack}>{myTiles.map(tile=><View key={tile.id} style={styles.tile}><Text style={{fontWeight:"900",fontSize:17,color:tile.color==="red"?"#D62828":tile.color==="blue"?"#1769AA":tile.color==="black"?"#171717":tile.color==="yellow"?"#B58A00":"#7A2CA0"}}>{tile.color==="joker"?"★":tile.number}</Text><Text style={styles.tileColor}>{tile.color==="joker"?"JOKER":tile.color.toUpperCase()}</Text></View>)}</View><Text style={styles.muted}>Bu sürümde taş dağıtımı hazır. Taş çekme, per açma, taş atma ve puanlama sıradaki geliştirmelerdir.</Text></View>}
            <Btn title="Odadan ayrıl" secondary onPress={leaveGameRoom}/>
            <Text style={styles.muted}>Oda ve taş dağıtımı sunucuya bağlıdır. Oyun hamleleri henüz tamamlanmadı.</Text>
          </View> : <>
            <Text style={styles.muted}>Bir oyun seçip oda kur. Arkadaşın kendi SOHVIA APK’sinden oda koduyla katılsın.</Text>
            <Text style={styles.section}>Odaya kodla katıl</Text>
            <Field placeholder="6 haneli oda kodu" autoCapitalize="characters" value={joinCode} onChangeText={setJoinCode}/>
            <Btn title={roomBusy?"Bağlanıyor…":"Odaya katıl"} onPress={joinGameRoom}/>
            <Text style={styles.section}>Oda oluştur</Text>
            {games.map(game=><TouchableOpacity key={game.slug} style={styles.rowCard} onPress={()=>openGame(game)} disabled={roomBusy}><Text style={styles.gameEmoji}>{game.slug==="okey-101"?"🀄":"🎲"}</Text><View style={{flex:1}}><Text style={styles.cardTitle}>{game.title}</Text><Text style={styles.muted}>{game.category || "Oyun"} • {game.min_players}-{game.max_players} kişi</Text></View><Text style={styles.gold}>Oda kur ›</Text></TouchableOpacity>)}
          </>}
        </>}
        {tab==="Sohbet" && <>
          <Text style={styles.heading}>Sohbet 💬</Text>
          {target ? <>
            <TouchableOpacity onPress={()=>setTarget(null)}><Text style={styles.gold}>‹ Sohbet listesine dön</Text></TouchableOpacity>
            <Text style={styles.cardTitle}>@{target.username}</Text>
            {messages.map(m=><View key={m.id} style={[styles.bubble,m.sender_id===session.user.id?styles.mine:styles.theirs]}><Text style={styles.bubbleText}>{m.body}</Text></View>)}
            <View style={styles.chatComposer}><TextInput style={styles.chatInput} placeholder="Mesajını yaz…" placeholderTextColor="#7892AE" value={message} onChangeText={setMessage} multiline maxLength={2000}/><TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={!message.trim()}><Text style={styles.sendButtonText}>➤</Text></TouchableOpacity></View>
            <Btn secondary title="Mesajları yenile" onPress={()=>loadMessages(target)}/>
          </> : <>
            <Text style={styles.muted}>Bir kişiye dokunarak özel sohbetini aç.</Text>
            {people.map(person=><TouchableOpacity key={person.id} style={styles.chatContact} onPress={()=>openChat(person)} activeOpacity={0.8}>
              <View style={styles.chatAvatar}><Text style={{fontSize:24}}>👤</Text></View>
              <View style={{flex:1}}><Text style={styles.chatName}>{person.display_name || person.username}</Text><Text style={styles.muted}>@{person.username}</Text></View>
              <Text style={styles.chatArrow}>›</Text>
            </TouchableOpacity>)}
            {people.length===0&&<Text style={styles.muted}>Henüz başka üye bulunmuyor.</Text>}
          </>}
        </>}
        {tab==="Profil" && <>
          <Text style={styles.heading}>Profilim 👤</Text>
          <View style={styles.profileCard}>{avatarUrl ? <Image source={{uri:avatarUrl}} style={styles.profileImage}/> : <Text style={styles.profileAvatar}>👑</Text>}<Text style={styles.heroTitle}>{profile?.display_name || "SOHVIA Üyesi"}</Text><Text style={styles.muted}>@{profile?.username || ""}</Text><Text style={styles.muted}>{profile?.bio || "Henüz biyografi eklenmedi."}</Text>
            <View style={styles.profileBadges}><Text style={styles.profileBadge}>👑 {(profile?.membership || "free").toUpperCase()}</Text><Text style={styles.profileBadge}>✓ {profile?.blue_tick ? "Mavi Tik" : "Doğrulanmamış"}</Text></View>
            <View style={styles.profileStats}><View><Text style={styles.profileStatValue}>—</Text><Text style={styles.muted}>Gönderi</Text></View><View><Text style={styles.profileStatValue}>—</Text><Text style={styles.muted}>Takipçi</Text></View><View><Text style={styles.profileStatValue}>—</Text><Text style={styles.muted}>Takip</Text></View></View>
            <Text style={styles.section}>Jeton: {wallet?.coin_balance ?? 0}</Text></View>
          <View style={styles.membershipPanel}><Text style={styles.membershipTitle}>SOHVIA ÜYELİKLERİ</Text><Text style={styles.membershipText}>PLUS · PRO · MAX</Text><Text style={styles.muted}>Üyelik paketleri ve profil efektleri. Ödeme altyapısı henüz etkin değil.</Text><View style={styles.membershipRow}><Text style={styles.membershipText}>Mavi Tik başvurusu</Text><Text style={styles.membershipPrice}>130 TL’den</Text></View><Text style={styles.muted}>18 yaş ve üzeri kullanıcılar içindir. Yaş doğrulaması ve ödeme bağlantısı tamamlanmadan başvuru/ödeme alınmaz.</Text></View>
          <Btn secondary title={uploading?"Yükleniyor…":"Profil fotoğrafını değiştir"} onPress={()=>chooseAndUpload("avatar")}/>
          <Text style={styles.section}>Biyografi</Text>
          <Field placeholder="Kendinden kısaca bahset (160 karakter)" value={bioDraft} onChangeText={setBioDraft} maxLength={160} multiline/>
          <Text style={styles.muted}>{bioDraft.length}/160</Text>
          <Btn title="Biyografiyi kaydet" onPress={saveBio}/>
          <Text style={styles.section}>Şifre güvenliği</Text>
          <Field placeholder="Yeni şifre (en az 12 karakter)" value={newPassword} onChangeText={setNewPassword} secureTextEntry/>
          <Btn title="Şifremi güncelle" onPress={changePassword}/>
          <Btn secondary title="Yenile" onPress={loadAppData}/>
          <Btn title="Çıkış yap" onPress={()=>supabase.auth.signOut()}/>
        </>}
        {tab==="Yönetici" && isAdmin && <>
          <Text style={styles.heading}>SOHVIA Yönetim Merkezi 👑</Text>
          <Text style={styles.muted}>Kullanıcı yönetimi · Moderasyon · Jeton · Üyelik · Mavi tik</Text>
          <Field placeholder="E-posta veya kullanıcı adı ara" value={adminSearch} onChangeText={setAdminSearch}/>
          <Btn title="Kullanıcıları ara / yenile" onPress={()=>loadAdminData()}/>
          <Text style={styles.section}>Kullanıcılar (son 100)</Text>
          {adminUsers.map(u=><TouchableOpacity key={u.user_id} style={[styles.rowCard,adminTarget?.user_id===u.user_id&&{borderColor:C.gold}]} onPress={()=>{setAdminTarget(u);setAdminCoins(String(u.coin_balance||0));}}>
            <View style={{flex:1}}><Text style={styles.cardTitle}>{u.display_name||u.username||u.email||"Üye"}</Text><Text style={styles.muted}>@{u.username||"kullanıcı adı yok"} · {u.email}</Text><Text style={styles.muted}>🪙 {u.coin_balance} · {u.membership.toUpperCase()} · {u.blue_tick?"✓ Mavi tik":"Mavi tik yok"} · {u.is_banned?"ENGELLİ":"Aktif"}</Text></View><Text style={styles.gold}>{adminTarget?.user_id===u.user_id?"Seçildi":"Seç"}</Text>
          </TouchableOpacity>)}
          {adminTarget && <View style={styles.postCard}>
            <Text style={styles.cardTitle}>Seçili: {adminTarget.email}</Text>
            <Text style={styles.section}>Hesap engelleme</Text>
            <Field placeholder="Engelleme nedeni" value={adminReason} onChangeText={setAdminReason}/>
            <Btn title="Kullanıcıyı engelle" onPress={()=>adminBan(adminTarget,true)}/>
            <Btn secondary title="Engeli kaldır" onPress={()=>adminBan(adminTarget,false)}/>
            <Text style={styles.section}>Jeton bakiyesi (tam bakiye belirle)</Text>
            <Field placeholder="Jeton miktarı" value={adminCoins} onChangeText={setAdminCoins} keyboardType="numeric"/>
            <Btn title="Jeton bakiyesini kaydet" onPress={adminSetCoins}/>
            <Text style={styles.section}>Üyelik ve mavi tik</Text>
            {[["free",false,"none","Ücretsiz"],["plus",false,"none","PLUS"],["pro",false,"none","PRO"],["max",false,"none","MAX"],[adminTarget.membership,true,"verified","Mavi tik ver"],[adminTarget.membership,false,"none","Mavi tiki kaldır"]].map((x,i)=><Btn key={i} secondary title={x[3]} onPress={()=>adminSetEntitlement(x[0],x[1],x[2])}/>)}
          </View>}
          <Text style={styles.section}>Kullanıcı raporları</Text>
          {adminReports.map(r=><View key={r.id} style={styles.postCard}><Text style={styles.cardTitle}>{r.reason}</Text><Text style={styles.muted}>{r.details||"Açıklama yok"} · {r.status}</Text><Btn secondary title="İnceleniyor" onPress={()=>adminReportStatus(r.id,"reviewing")}/><Btn title="Çözüldü" onPress={()=>adminReportStatus(r.id,"resolved")}/><Btn secondary title="Raporu kapat" onPress={()=>adminReportStatus(r.id,"dismissed")}/></View>)}
          {adminReports.length===0&&<Text style={styles.muted}>Açık rapor bulunmuyor.</Text>}
        </>}
      </ScrollView>
      <Modal visible={!!selectedStory} transparent animationType="fade" onRequestClose={()=>setSelectedStory(null)}>
        <View style={styles.storyModal}>
          <TouchableOpacity style={styles.storyClose} onPress={()=>setSelectedStory(null)}><Text style={styles.storyCloseText}>✕ Kapat</Text></TouchableOpacity>
          {selectedStory && selectedStory.media_type === "image" ? (
            <Image source={{uri:supabase.storage.from("sohvia-media").getPublicUrl(selectedStory.media_path).data.publicUrl}} style={styles.storyViewer} resizeMode="contain" />
          ) : selectedStory ? (
            <TouchableOpacity style={styles.videoOpen} onPress={()=>Linking.openURL(supabase.storage.from("sohvia-media").getPublicUrl(selectedStory.media_path).data.publicUrl)}><Text style={styles.heroTitle}>▶ Videoyu aç</Text><Text style={styles.muted}>Video cihazındaki oynatıcıda açılır.</Text></TouchableOpacity>
          ) : null}
          <Text style={styles.gold}>{selectedStory ? "@" + (selectedStory.profiles?.username || "üye") : ""}</Text>
          <Text style={styles.muted}>Hikâyeler 24 saat sonra sona erer.</Text>
        </View>
      </Modal>
      <View style={styles.nav}>
        {["Ana Sayfa","Keşfet","Oyunlar","Video","Sohbet","Profil",...(isAdmin?["Yönetici"]:[])].map((x,i)=><TouchableOpacity key={x} style={styles.navItem} onPress={()=>{if(x==="Video"){setRandomVideo(true);return;}setTab(x);if(x!=="Sohbet")setTarget(null);}}><Text style={[styles.navIcon,tab===x&&styles.navIconActive]}>{["⌂","⌕","🎮","▣","✉","◎","♛"][i]}</Text><Text style={[styles.navText,tab===x&&{color:C.blue,fontWeight:"900"}]}>{x}</Text></TouchableOpacity>)}
      </View>
    </SafeAreaView>
  );
}
function StatusBarShim(){ return <StatusBar barStyle="light-content" backgroundColor={C.bg}/>; }

const styles=StyleSheet.create({
  container:{flex:1,backgroundColor:C.bg},center:{flex:1,backgroundColor:C.bg,alignItems:"center",justifyContent:"center"},
  authWrap:{flex:1,justifyContent:"center",padding:24},brandMark:{width:82,height:82,borderRadius:26,alignSelf:"center",alignItems:"center",justifyContent:"center",backgroundColor:"#0C2C55",borderWidth:1.5,borderColor:"#38BFFF",shadowColor:"#159BFF",shadowOpacity:0.45,shadowRadius:18,elevation:10,marginBottom:8},brandCrown:{position:"absolute",top:1,color:"#8CE4FF",fontSize:23},logo:{fontSize:42,fontWeight:"900",color:"#FFFFFF",textAlign:"center",marginTop:12,textShadowColor:"#168BFF",textShadowRadius:12},brandName:{fontSize:24,fontWeight:"900",color:C.white,textAlign:"center",letterSpacing:4,marginTop:3},
  subtitle:{color:"#7DD7FF",textAlign:"center",marginTop:7,marginBottom:12,fontWeight:"700",letterSpacing:1},trustLine:{alignSelf:"center",backgroundColor:"#0D2B4D",borderWidth:1,borderColor:"#1D6094",paddingHorizontal:14,paddingVertical:8,borderRadius:20,marginBottom:25},trustText:{color:"#B9E8FF",fontSize:11,fontWeight:"700"},heading:{fontSize:25,color:C.white,fontWeight:"bold",marginBottom:16},
  field:{backgroundColor:"#102947",color:C.white,padding:16,borderRadius:15,marginBottom:12,borderWidth:1,borderColor:"#2C5D8D"},
  btn:{backgroundColor:"#087BEE",padding:16,borderRadius:15,alignItems:"center",marginTop:10,borderWidth:1,borderColor:"#54CFFF",shadowColor:"#008CFF",shadowOpacity:0.22,shadowRadius:8,elevation:3},btnSecondary:{backgroundColor:"#0D2745",borderWidth:1,borderColor:"#347DB4"},
  btnText:{color:"#FFFFFF",fontWeight:"900",letterSpacing:0.3},note:{color:C.muted,fontSize:11,textAlign:"center",marginTop:18,lineHeight:17},
  header:{paddingHorizontal:18,paddingVertical:13,borderBottomWidth:1,borderColor:C.line,backgroundColor:"#0A203C",flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  logoSmall:{color:C.white,fontSize:23,fontWeight:"900",letterSpacing:2},muted:{color:C.muted,fontSize:12,marginTop:4},coins:{color:C.gold,backgroundColor:C.card,padding:10,borderRadius:18},
  body:{flex:1,paddingHorizontal:16,paddingTop:18},hero:{backgroundColor:"#10345B",padding:20,borderRadius:22,borderWidth:1,borderColor:"#258BD0",marginBottom:20},
  kicker:{color:C.gold,fontWeight:"bold",fontSize:11},heroTitle:{color:C.white,fontWeight:"bold",fontSize:24,marginVertical:10},section:{color:C.white,fontWeight:"bold",fontSize:17,marginTop:18,marginBottom:10},
  rowCard:{backgroundColor:C.card,padding:13,borderRadius:14,marginBottom:9,flexDirection:"row",alignItems:"center",gap:10,borderWidth:1,borderColor:C.line},
  gamesPromo:{backgroundColor:"#0D2C50",borderWidth:1,borderColor:"#267FC0",borderRadius:20,padding:18,marginBottom:18},gamesEyebrow:{color:"#C3A2FF",fontWeight:"900",fontSize:10,letterSpacing:2},gamesPromoTitle:{color:C.white,fontSize:22,fontWeight:"900",marginTop:8,lineHeight:28},gamesStats:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:14},gamesStat:{color:"#D8C8F2",fontSize:10,backgroundColor:"#35294A",padding:8,borderRadius:10},gameTile:{backgroundColor:"#102747",borderWidth:1,borderRadius:18,padding:12,marginBottom:11,flexDirection:"row",alignItems:"center",gap:12},gameArt:{width:88,height:92,borderRadius:17,borderWidth:1,alignItems:"center",justifyContent:"center",position:"relative"},gameArtMark:{fontSize:10,fontWeight:"900",position:"absolute",bottom:5,right:8},gameTag:{fontSize:9,fontWeight:"900",letterSpacing:1.5},gameName:{fontSize:17,color:C.white,fontWeight:"900",marginTop:3},gamePlayers:{color:"#D8C8F2",fontSize:10,marginTop:6},playPill:{paddingHorizontal:11,paddingVertical:9,borderRadius:12},playPillText:{color:"#17101E",fontWeight:"900",fontSize:10},tableHeader:{marginBottom:12},okeyTable:{backgroundColor:"#103D35",borderRadius:18,borderWidth:2,borderColor:"#C69A4A",padding:14,marginTop:12,marginBottom:12},okeyTableTitle:{color:"#F4D28B",fontWeight:"900",letterSpacing:2,textAlign:"center",marginBottom:12},okeyCenter:{backgroundColor:"#145347",borderRadius:50,padding:15,alignItems:"center",marginBottom:14,borderWidth:1,borderColor:"#438B72"},okeyCenterEmoji:{fontSize:32},okeyCenterText:{color:"#F7E5B9",fontWeight:"900",fontSize:11,letterSpacing:1},tileRack:{flexDirection:"row",flexWrap:"wrap",gap:5,marginVertical:12},tile:{backgroundColor:"#FFF9EC",borderRadius:7,width:36,height:51,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:"#D9C9A8",elevation:2},tileColor:{fontSize:5,color:"#746B60",fontWeight:"700",marginTop:2},
  cardTitle:{color:C.white,fontWeight:"bold",fontSize:14},gold:{color:C.gold,fontWeight:"bold"},gameEmoji:{fontSize:25},avatar:{fontSize:26,marginRight:4},
  nav:{flexDirection:"row",justifyContent:"space-around",paddingTop:9,paddingBottom:20,backgroundColor:"#FFFFFF",borderTopWidth:1,borderColor:C.line},
  videoLaunch:{backgroundColor:"#0B3159",borderWidth:1,borderColor:"#27AFFF",borderRadius:18,padding:15,marginBottom:18,flexDirection:"row",alignItems:"center",gap:12},videoLaunchIcon:{fontSize:30},videoLaunchTitle:{color:C.white,fontWeight:"900",fontSize:15},videoLaunchArrow:{color:"#67D8FF",fontSize:26,fontWeight:"900"},
  navItem:{alignItems:"center",justifyContent:"center",minWidth:48,flex:1,paddingVertical:3},navIcon:{fontSize:27,color:"#6F88A5",fontWeight:"700"},navIconActive:{color:C.blue,fontSize:30},navText:{color:C.muted,fontSize:10,marginTop:2},
  bubble:{padding:13,borderRadius:18,marginVertical:6,maxWidth:"84%",borderWidth:1},mine:{backgroundColor:"#DCEEFF",borderColor:"#B8DBFF",alignSelf:"flex-end",borderBottomRightRadius:5},theirs:{backgroundColor:"#FFFFFF",borderColor:C.line,alignSelf:"flex-start",borderBottomLeftRadius:5},
  bubbleText:{color:"#173653",fontSize:15,lineHeight:21},compose:{flexDirection:"row",alignItems:"center",gap:10,marginTop:12},messageInput:{flex:1,backgroundColor:C.card,color:C.white,padding:12,borderRadius:12},
  chatContact:{backgroundColor:"#FFFFFF",borderWidth:1,borderColor:C.line,borderRadius:17,padding:13,marginBottom:10,flexDirection:"row",alignItems:"center",gap:12},chatAvatar:{width:52,height:52,borderRadius:26,backgroundColor:"#E7F2FF",alignItems:"center",justifyContent:"center"},chatName:{color:"#173653",fontWeight:"900",fontSize:16},chatArrow:{fontSize:30,color:C.blue},chatComposer:{flexDirection:"row",alignItems:"flex-end",gap:9,marginTop:14,padding:8,backgroundColor:"#FFFFFF",borderRadius:20,borderWidth:1,borderColor:C.line},chatInput:{flex:1,maxHeight:110,minHeight:42,color:"#173653",fontSize:15,paddingHorizontal:10,paddingVertical:9},sendButton:{width:44,height:44,borderRadius:22,backgroundColor:C.blue,alignItems:"center",justifyContent:"center"},sendButtonText:{color:"#FFFFFF",fontSize:22,fontWeight:"900"},
  profileBadges:{flexDirection:"row",gap:8,marginTop:12,flexWrap:"wrap"},profileBadge:{backgroundColor:"#E8F3FF",color:"#087BEE",paddingHorizontal:12,paddingVertical:7,borderRadius:14,fontWeight:"900",overflow:"hidden"},profileStats:{flexDirection:"row",justifyContent:"space-around",width:"100%",marginTop:18,paddingTop:15,borderTopWidth:1,borderColor:C.line},profileStatValue:{fontSize:20,fontWeight:"900",color:"#173653",textAlign:"center"},membershipPanel:{backgroundColor:"#FFFFFF",borderRadius:18,borderWidth:1,borderColor:"#CFE3F8",padding:16,marginTop:14},membershipTitle:{color:"#087BEE",fontWeight:"900",fontSize:15,letterSpacing:1},membershipText:{color:"#173653",fontWeight:"900",fontSize:15,marginTop:8},membershipPrice:{color:"#087BEE",fontWeight:"900",fontSize:16},membershipRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:14,paddingTop:12,borderTopWidth:1,borderColor:C.line},
  profileCard:{backgroundColor:C.card,padding:22,borderRadius:18,alignItems:"center"},profileAvatar:{fontSize:60,marginBottom:12},profileImage:{width:104,height:104,borderRadius:52,marginBottom:12,borderWidth:2,borderColor:C.gold},
  postCard:{backgroundColor:C.card,padding:15,borderRadius:15,marginBottom:12,borderWidth:1,borderColor:C.line},postBody:{color:C.white,fontSize:15,marginVertical:12,lineHeight:21},commentText:{color:C.muted,fontSize:12,marginTop:7},storyPill:{backgroundColor:C.card,borderRadius:13,padding:12,marginRight:8,minWidth:120}
});
