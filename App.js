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

const C = { bg:"#211625", card:"#38263B", gold:"#E5B85C", white:"#FFF8EE", muted:"#B9A9B9", line:"#59445A" };

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
    } catch(e) {
      Alert.alert("Veri yüklenemedi", e.message || "Lütfen tekrar dene.");
    }
  }


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
        <Text style={styles.logo}>👑 SOHVIA</Text>
        <Text style={styles.subtitle}>Bağlan • Paylaş • Oyna</Text>
        <Text style={styles.heading}>{mode==="login"?"Tekrar hoş geldin":"SOHVIA'ya katıl"}</Text>
        {mode==="signup" && <>
          <Field placeholder="Kullanıcı adı (5-24 karakter)" value={username} onChangeText={setUsername} autoCapitalize="none"/>
          <Field placeholder="Görünen ad" value={displayName} onChangeText={setDisplayName}/>
        </>}
        <Field placeholder="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"/>
        <Field placeholder="Şifre (en az 6 karakter)" value={password} onChangeText={setPassword} secureTextEntry/>
        <Btn title={busy?"Bekle…":mode==="login"?"Giriş yap":"Ücretsiz hesap oluştur"} onPress={authAction}/>
        <Btn secondary title={mode==="login"?"Hesabın yok mu? Kayıt ol":"Zaten hesabın var mı? Giriş yap"} onPress={()=>setMode(mode==="login"?"signup":"login")}/>
        <Text style={styles.note}>Bu ilk bağlantı sürümüdür. Kayıt e-posta doğrulaması isteyebilir.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

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
          <Text style={styles.section}>Oyun merkezinden seç</Text>
          {games.slice(0,6).map(game=><TouchableOpacity key={game.slug} style={styles.rowCard} onPress={()=>Alert.alert(game.title,"Oyun kataloğu bağlı. Bu oyunun çevrim içi oyun motoru henüz geliştirilmedi.")}><Text style={styles.gameEmoji}>🎮</Text><View style={{flex:1}}><Text style={styles.cardTitle}>{game.title}</Text><Text style={styles.muted}>{game.category || "SOHVIA oyunu"}</Text></View><Text style={styles.gold}>İncele ›</Text></TouchableOpacity>)}
        </>}
        {tab==="Keşfet" && <>
          <Text style={styles.heading}>İnsanları keşfet</Text>
          {people.map(person=><View key={person.id} style={styles.rowCard}><Text style={styles.avatar}>👤</Text><View style={{flex:1}}><Text style={styles.cardTitle}>{person.display_name || person.username}</Text><Text style={styles.muted}>@{person.username}</Text></View><TouchableOpacity onPress={()=>sendFriendRequest(person)}><Text style={styles.gold}>+ Ekle</Text></TouchableOpacity><TouchableOpacity onPress={()=>openChat(person)}><Text style={styles.gold}>  Mesaj</Text></TouchableOpacity></View>)}
        </>}
        {tab==="Oyunlar" && <>
          <Text style={styles.heading}>Oyun Merkezi 🎮</Text>
          {games.map(game=><TouchableOpacity key={game.slug} style={styles.rowCard} onPress={()=>Alert.alert(game.title,"Bu oyunun katalog kaydı hazır. Çevrim içi oyun odası ve oyun kuralları henüz tamamlanmadı.")}><Text style={styles.gameEmoji}>🎲</Text><View style={{flex:1}}><Text style={styles.cardTitle}>{game.title}</Text><Text style={styles.muted}>{game.category || "Oyun"} • {game.min_players}-{game.max_players} kişi</Text></View><Text style={styles.gold}>›</Text></TouchableOpacity>)}
        </>}
        {tab==="Sohbet" && <>
          <Text style={styles.heading}>Sohbet 💬</Text>
          {target ? <>
            <TouchableOpacity onPress={()=>setTarget(null)}><Text style={styles.gold}>‹ Sohbet listesine dön</Text></TouchableOpacity>
            <Text style={styles.cardTitle}>@{target.username}</Text>
            {messages.map(m=><View key={m.id} style={[styles.bubble,m.sender_id===session.user.id?styles.mine:styles.theirs]}><Text style={styles.bubbleText}>{m.body}</Text></View>)}
            <View style={styles.compose}><TextInput style={styles.messageInput} placeholder="Mesaj yaz…" placeholderTextColor={C.muted} value={message} onChangeText={setMessage}/><TouchableOpacity onPress={sendMessage}><Text style={styles.gold}>Gönder</Text></TouchableOpacity></View>
            <Btn secondary title="Mesajları yenile" onPress={()=>loadMessages(target)}/>
          </> : <Text style={styles.muted}>Mesaj başlatmak için Keşfet bölümünden bir kullanıcı seç.</Text>}
        </>}
        {tab==="Profil" && <>
          <Text style={styles.heading}>Profilim 👤</Text>
          <View style={styles.profileCard}>{avatarUrl ? <Image source={{uri:avatarUrl}} style={styles.profileImage}/> : <Text style={styles.profileAvatar}>👑</Text>}<Text style={styles.heroTitle}>{profile?.display_name || "SOHVIA Üyesi"}</Text><Text style={styles.muted}>@{profile?.username || ""}</Text><Text style={styles.muted}>{profile?.bio || "Henüz biyografi eklenmedi."}</Text><Text style={styles.section}>Jeton: {wallet?.coin_balance ?? 0}</Text></View>
          <Btn secondary title={uploading?"Yükleniyor…":"Profil fotoğrafını değiştir"} onPress={()=>chooseAndUpload("avatar")}/>
          <Text style={styles.section}>Biyografi</Text>
          <Field placeholder="Kendinden kısaca bahset (160 karakter)" value={bioDraft} onChangeText={setBioDraft} maxLength={160} multiline/>
          <Text style={styles.muted}>{bioDraft.length}/160</Text>
          <Btn title="Biyografiyi kaydet" onPress={saveBio}/>
          <Btn secondary title="Yenile" onPress={loadAppData}/>
          <Btn title="Çıkış yap" onPress={()=>supabase.auth.signOut()}/>
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
        {["Ana Sayfa","Keşfet","Oyunlar","Sohbet","Profil"].map((x,i)=><TouchableOpacity key={x} style={styles.navItem} onPress={()=>{setTab(x);if(x!=="Sohbet")setTarget(null);}}><Text style={{fontSize:19}}>{["🏠","🔎","🎮","💬","👤"][i]}</Text><Text style={[styles.navText,tab===x&&{color:C.gold}]}>{x}</Text></TouchableOpacity>)}
      </View>
    </SafeAreaView>
  );
}
function StatusBarShim(){ return <StatusBar barStyle="light-content" backgroundColor={C.bg}/>; }

const styles=StyleSheet.create({
  container:{flex:1,backgroundColor:C.bg},center:{flex:1,backgroundColor:C.bg,alignItems:"center",justifyContent:"center"},
  authWrap:{flex:1,justifyContent:"center",padding:24},logo:{fontSize:36,fontWeight:"900",color:C.gold,textAlign:"center",letterSpacing:3},
  subtitle:{color:C.muted,textAlign:"center",marginTop:8,marginBottom:30},heading:{fontSize:25,color:C.white,fontWeight:"bold",marginBottom:16},
  field:{backgroundColor:C.card,color:C.white,padding:15,borderRadius:12,marginBottom:12,borderWidth:1,borderColor:C.line},
  btn:{backgroundColor:C.gold,padding:15,borderRadius:12,alignItems:"center",marginTop:10},btnSecondary:{backgroundColor:"transparent",borderWidth:1,borderColor:C.gold},
  btnText:{color:C.bg,fontWeight:"bold"},note:{color:C.muted,fontSize:11,textAlign:"center",marginTop:18,lineHeight:17},
  header:{paddingHorizontal:18,paddingVertical:13,borderBottomWidth:1,borderColor:C.line,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
  logoSmall:{color:C.gold,fontSize:23,fontWeight:"900",letterSpacing:2},muted:{color:C.muted,fontSize:12,marginTop:4},coins:{color:C.gold,backgroundColor:C.card,padding:10,borderRadius:18},
  body:{flex:1,paddingHorizontal:16,paddingTop:18},hero:{backgroundColor:C.card,padding:20,borderRadius:20,borderWidth:1,borderColor:"#80603C",marginBottom:20},
  kicker:{color:C.gold,fontWeight:"bold",fontSize:11},heroTitle:{color:C.white,fontWeight:"bold",fontSize:24,marginVertical:10},section:{color:C.white,fontWeight:"bold",fontSize:17,marginTop:18,marginBottom:10},
  rowCard:{backgroundColor:C.card,padding:13,borderRadius:14,marginBottom:9,flexDirection:"row",alignItems:"center",gap:10,borderWidth:1,borderColor:C.line},
  cardTitle:{color:C.white,fontWeight:"bold",fontSize:14},gold:{color:C.gold,fontWeight:"bold"},gameEmoji:{fontSize:25},avatar:{fontSize:26,marginRight:4},
  nav:{flexDirection:"row",justifyContent:"space-around",paddingTop:9,paddingBottom:20,backgroundColor:"#190F1D",borderTopWidth:1,borderColor:C.line},
  navItem:{alignItems:"center",minWidth:55},navText:{color:C.muted,fontSize:9,marginTop:4},
  bubble:{padding:12,borderRadius:13,marginVertical:5,maxWidth:"85%"},mine:{backgroundColor:"#624A35",alignSelf:"flex-end"},theirs:{backgroundColor:C.card,alignSelf:"flex-start"},
  bubbleText:{color:C.white},compose:{flexDirection:"row",alignItems:"center",gap:10,marginTop:12},messageInput:{flex:1,backgroundColor:C.card,color:C.white,padding:12,borderRadius:12},
  profileCard:{backgroundColor:C.card,padding:22,borderRadius:18,alignItems:"center"},profileAvatar:{fontSize:60,marginBottom:12},profileImage:{width:104,height:104,borderRadius:52,marginBottom:12,borderWidth:2,borderColor:C.gold},
  postCard:{backgroundColor:C.card,padding:15,borderRadius:15,marginBottom:12,borderWidth:1,borderColor:C.line},postBody:{color:C.white,fontSize:15,marginVertical:12,lineHeight:21},commentText:{color:C.muted,fontSize:12,marginTop:7},storyPill:{backgroundColor:C.card,borderRadius:13,padding:12,marginRight:8,minWidth:120}
});
