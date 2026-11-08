import React, {useMemo, useState} from 'react';
import {View, Text, TouchableOpacity, ScrollView, Alert} from 'react-native';
import {Chess} from 'chess.js';

const GOLD='#E6C36A', PURPLE='#241331', DARK='#160D20', LIGHT='#F0DDBB', GREEN='#557B59';
const FILES='abcdefgh';
const PIECES={w:{k:'♔',q:'♕',r:'♖',b:'♗',n:'♘',p:'♙'},b:{k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'}};

export default function ChessGameScreen({onExit=()=>{}, onMove}) {
  const [game,setGame]=useState(()=>new Chess());
  const [selected,setSelected]=useState(null);
  const [legal,setLegal]=useState([]);
  const [history,setHistory]=useState([]);
  const [flipped,setFlipped]=useState(false);
  const [revision,setRevision]=useState(0);
  const board=useMemo(()=>{const b=game.board();return flipped?[...b].reverse().map(r=>[...r].reverse()):b;},[game,revision,flipped]);
  const files=flipped?[...FILES].reverse():[...FILES];
  const rows=flipped?[8,7,6,5,4,3,2,1]:[1,2,3,4,5,6,7,8];
  const status=game.isCheckmate()?'ŞAH MAT · OYUN BİTTİ':game.isStalemate()?'PAT · BERABERE':game.isDraw()?'BERABERE':game.isCheck()?'ŞAH!':`${game.turn()==='w'?'BEYAZ':'SİYAH'} OYNUYOR`;
  const finish=game.isGameOver();
  function choose(square){
    if(finish)return;
    const piece=game.get(square);
    if(selected){
      try{
        const move=game.move({from:selected,to:square,promotion:'q'});
        if(move){setHistory(game.history());setSelected(null);setLegal([]);setRevision(x=>x+1);onMove?.({fen:game.fen(),san:move.san,uci:move.from+move.to+(move.promotion||'')});if(game.isGameOver())Alert.alert('Oyun bitti',game.isCheckmate()?'Şah mat!': 'Berabere.');return;}
      }catch(e){}
    }
    if(piece && piece.color===game.turn()){
      setSelected(square);setLegal(game.moves({square,verbose:true}).map(m=>m.to));
    }else{setSelected(null);setLegal([]);}
  }
  function undo(){if(!game.undo())return;setHistory(game.history());setSelected(null);setLegal([]);setRevision(x=>x+1);}
  function restart(){setGame(new Chess());setHistory([]);setSelected(null);setLegal([]);setRevision(x=>x+1);}
  return <ScrollView style={{flex:1,backgroundColor:DARK}} contentContainerStyle={{padding:16,paddingBottom:34}}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
      <TouchableOpacity onPress={onExit} style={{padding:10,backgroundColor:PURPLE,borderRadius:12}}><Text style={{color:GOLD,fontWeight:'700'}}>‹ Geri</Text></TouchableOpacity>
      <View><Text style={{color:GOLD,fontSize:20,fontWeight:'900',letterSpacing:2,textAlign:'center'}}>SOHVIA</Text><Text style={{color:'#C9B9D5',fontSize:11,textAlign:'center'}}>♟ SATRANÇ</Text></View>
      <TouchableOpacity onPress={()=>setFlipped(v=>!v)} style={{padding:10,backgroundColor:PURPLE,borderRadius:12}}><Text style={{color:GOLD,fontWeight:'700'}}>Çevir ↻</Text></TouchableOpacity>
    </View>
    <View style={{backgroundColor:PURPLE,borderColor:'#76552C',borderWidth:1,borderRadius:14,padding:13,marginBottom:14}}>
      <Text style={{color:GOLD,fontWeight:'900',textAlign:'center',fontSize:15}}>{status}</Text>
      <Text style={{color:'#D8CCDF',textAlign:'center',fontSize:12,marginTop:5}}>{finish?'Yeni oyun başlatabilir veya hamleleri inceleyebilirsin.':'Taşa dokun, sonra gitmesini istediğin kareye dokun.'}</Text>
    </View>
    <View style={{alignSelf:'center',width:'100%',maxWidth:420,aspectRatio:1,borderWidth:4,borderColor:GOLD,borderRadius:8,overflow:'hidden'}}>
      {board.map((rank,r)=> <View key={r} style={{flex:1,flexDirection:'row'}}>{rank.map((piece,c)=>{
        const square=files[c]+rows[r];const isDark=(FILES.indexOf(square[0])+Number(square[1]))%2===0;const isSel=selected===square;const isLegal=legal.includes(square);
        return <TouchableOpacity key={square} onPress={()=>choose(square)} activeOpacity={0.85} style={{flex:1,backgroundColor:isSel?'#C5A04D':isDark?GREEN:LIGHT,alignItems:'center',justifyContent:'center',borderWidth:isLegal?2:0,borderColor:'#F6D77C'}}>
          {piece?<Text style={{fontSize:34,color:piece.color==='w'?'#FFFDF7':'#17121B',textShadowColor:piece.color==='w'?'#2A2030':'#D8C8A6',textShadowRadius:2}}>{PIECES[piece.color][piece.type]}</Text>:isLegal?<View style={{width:12,height:12,borderRadius:10,backgroundColor:'#E9D18A'}}/>:null}
          {c===0?<Text style={{position:'absolute',top:1,left:3,fontSize:8,color:isDark?LIGHT:GREEN}}>{rows[r]}</Text>:null}
          {r===7?<Text style={{position:'absolute',bottom:0,right:3,fontSize:8,color:isDark?LIGHT:GREEN}}>{files[c]}</Text>:null}
        </TouchableOpacity>;
      })}</View>)}
    </View>
    <View style={{flexDirection:'row',gap:9,marginTop:16}}>
      <TouchableOpacity onPress={undo} style={{flex:1,backgroundColor:PURPLE,padding:13,borderRadius:12,alignItems:'center'}}><Text style={{color:GOLD,fontWeight:'800'}}>↶ Geri al</Text></TouchableOpacity>
      <TouchableOpacity onPress={restart} style={{flex:1,backgroundColor:'#5B3A70',padding:13,borderRadius:12,alignItems:'center'}}><Text style={{color:'white',fontWeight:'800'}}>＋ Yeni oyun</Text></TouchableOpacity>
    </View>
    <View style={{marginTop:16,padding:13,backgroundColor:PURPLE,borderRadius:12}}>
      <Text style={{color:GOLD,fontWeight:'900',marginBottom:7}}>HAMLELER</Text>
      <Text style={{color:'#EEE6F2',fontSize:13}}>{history.length?history.map((m,i)=>`${Math.floor(i/2)+1}${i%2===0?'.':'...'} ${m}`).join('   '):'Henüz hamle yapılmadı.'}</Text>
    </View>
    <Text style={{color:'#9E8DAA',fontSize:11,textAlign:'center',marginTop:14}}>Kurallar: şah, mat, rok, geçerken alma, terfi, pat ve beraberlik kontrolleri chess.js kurallarıyla uygulanır. Bu ekran şu anda aynı cihazda yerel oyundur; çevrim içi eşleşme ayrıca sunucuya bağlanmalıdır.</Text>
  </ScrollView>;
}
