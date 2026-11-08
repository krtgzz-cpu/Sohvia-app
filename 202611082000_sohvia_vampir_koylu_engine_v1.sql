-- SOHVIA Vampir Köylü v1: server-authoritative rooms, secret roles, night actions and voting.
-- Apply after 202611081800_sohvia_multiplayer_game_rooms.sql.
create table if not exists public.sohvia_vampir_rooms (
 id uuid primary key default gen_random_uuid(),
 room_code text not null unique,
 host_user_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'waiting' check(status in ('waiting','playing','finished','cancelled')),
 phase text not null default 'lobby' check(phase in ('lobby','night','morning','discussion','voting','finished')),
 max_players int not null default 12 check(max_players between 4 and 16),
 round_no int not null default 0,
 phase_ends_at timestamptz,
 public_state jsonb not null default '{}'::jsonb,
 winner text check(winner in ('village','vampires')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.sohvia_vampir_players (
 room_id uuid not null references public.sohvia_vampir_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 seat_no int not null check(seat_no between 1 and 16),
 display_name text not null default 'Oyuncu',
 is_alive boolean not null default true,
 is_ready boolean not null default false,
 joined_at timestamptz not null default now(),
 primary key(room_id,user_id), unique(room_id,seat_no)
);
create schema if not exists private;
create table if not exists private.sohvia_vampir_secret_roles (
 room_id uuid not null references public.sohvia_vampir_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('vampire','police','villager','doctor','seer')),
 primary key(room_id,user_id)
);
revoke all on schema private from public,anon,authenticated;
revoke all on private.sohvia_vampir_secret_roles from public,anon,authenticated;
create table if not exists public.sohvia_vampir_actions (
 id bigint generated always as identity primary key,
 room_id uuid not null references public.sohvia_vampir_rooms(id) on delete cascade,
 round_no int not null,
 actor_user_id uuid not null references auth.users(id) on delete cascade,
 action_type text not null check(action_type in ('attack','protect','investigate','vote','pass')),
 target_user_id uuid references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 unique(room_id,round_no,actor_user_id,action_type)
);
alter table public.sohvia_vampir_rooms enable row level security;
alter table public.sohvia_vampir_players enable row level security;
alter table public.sohvia_vampir_actions enable row level security;
-- Clients only read lobby/public roster. Secret role and action tables are not directly readable.
create policy "vampir room members read room" on public.sohvia_vampir_rooms for select to authenticated
 using(exists(select 1 from public.sohvia_vampir_players p where p.room_id=id and p.user_id=(select auth.uid())));
create policy "vampir members read public roster" on public.sohvia_vampir_players for select to authenticated
 using(exists(select 1 from public.sohvia_vampir_players me where me.room_id=sohvia_vampir_players.room_id and me.user_id=(select auth.uid())));
revoke all on public.sohvia_vampir_rooms,public.sohvia_vampir_players,public.sohvia_vampir_actions from anon,authenticated;
grant select on public.sohvia_vampir_rooms,public.sohvia_vampir_players to authenticated;

create or replace function public.sohvia_vampir_create_room(p_max_players int default 12,p_display_name text default 'Oyuncu')
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_room public.sohvia_vampir_rooms; v_code text;
begin
 if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
 if p_max_players not between 4 and 16 then raise exception 'Oda 4-16 oyuncu olmalı.'; end if;
 loop v_code:=upper(substr(encode(gen_random_bytes(4),'hex'),1,6)); exit when not exists(select 1 from public.sohvia_vampir_rooms r where r.room_code=v_code and r.status in('waiting','playing')); end loop;
 insert into public.sohvia_vampir_rooms(room_code,host_user_id,max_players) values(v_code,auth.uid(),p_max_players) returning * into v_room;
 insert into public.sohvia_vampir_players(room_id,user_id,seat_no,display_name) values(v_room.id,auth.uid(),1,left(coalesce(nullif(trim(p_display_name),''),'Oyuncu'),24));
 return jsonb_build_object('room_id',v_room.id,'room_code',v_code,'status','waiting','phase','lobby');
end $$;

create or replace function public.sohvia_vampir_join_room(p_room_code text,p_display_name text default 'Oyuncu')
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_room public.sohvia_vampir_rooms; v_seat int;
begin
 if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
 select * into v_room from public.sohvia_vampir_rooms where room_code=upper(trim(p_room_code)) and status='waiting' for update;
 if not found then raise exception 'Oda bulunamadı veya oyun başlamış.'; end if;
 if exists(select 1 from public.sohvia_vampir_players where room_id=v_room.id and user_id=auth.uid()) then return jsonb_build_object('room_id',v_room.id,'room_code',v_room.room_code); end if;
 select coalesce(max(seat_no),0)+1 into v_seat from public.sohvia_vampir_players where room_id=v_room.id;
 if v_seat>v_room.max_players then raise exception 'Oda dolu.'; end if;
 insert into public.sohvia_vampir_players(room_id,user_id,seat_no,display_name) values(v_room.id,auth.uid(),v_seat,left(coalesce(nullif(trim(p_display_name),''),'Oyuncu'),24));
 return jsonb_build_object('room_id',v_room.id,'room_code',v_room.room_code);
end $$;

create or replace function public.sohvia_vampir_start(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_room public.sohvia_vampir_rooms; v_count int; v_vamps int; v_roles text[]; v_i int; v_player record;
begin
 select * into v_room from public.sohvia_vampir_rooms where id=p_room_id for update;
 if not found or v_room.host_user_id<>auth.uid() then raise exception 'Sadece oda sahibi başlatabilir.'; end if;
 if v_room.status<>'waiting' then raise exception 'Oyun zaten başlamış.'; end if;
 select count(*) into v_count from public.sohvia_vampir_players where room_id=p_room_id;
 if v_count<4 then raise exception 'Başlamak için en az 4 oyuncu gerekli.'; end if;
 v_vamps:=greatest(1,least(4,ceil(v_count::numeric/5)::int));
 v_roles:=array[]::text[];
 for v_i in 1..v_vamps loop v_roles:=array_append(v_roles,'vampire'); end loop;
 v_roles:=array_append(v_roles,'police');
 if v_count>=6 then v_roles:=array_append(v_roles,'seer'); end if;
 if v_count>=7 then v_roles:=array_append(v_roles,'doctor'); end if;
 while cardinality(v_roles)<v_count loop v_roles:=array_append(v_roles,'villager'); end loop;
 -- Shuffle roles, assign only in protected table. Public roster never exposes role.
 for v_player in select user_id from public.sohvia_vampir_players where room_id=p_room_id order by random() loop
   insert into private.sohvia_vampir_secret_roles(room_id,user_id,role) values(p_room_id,v_player.user_id,v_roles[1]) on conflict(room_id,user_id) do update set role=excluded.role;
   update public.sohvia_vampir_players set is_alive=true where room_id=p_room_id and user_id=v_player.user_id;
   v_roles:=v_roles[2:cardinality(v_roles)];
 end loop;
 update public.sohvia_vampir_rooms set status='playing',phase='night',round_no=1,phase_ends_at=now()+interval '45 seconds',public_state=jsonb_build_object('message','İlk gece başladı.','living_count',v_count),updated_at=now() where id=p_room_id;
 return jsonb_build_object('status','playing','phase','night','round_no',1,'phase_ends_at',now()+interval '45 seconds');
end $$;

create or replace function public.sohvia_vampir_my_role(p_room_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_me public.sohvia_vampir_players; v_role text; v_all jsonb;
begin
 select * into v_me from public.sohvia_vampir_players where room_id=p_room_id and user_id=auth.uid();
 if not found then raise exception 'Bu odada değilsin.'; end if;
 select role into v_role from private.sohvia_vampir_secret_roles where room_id=p_room_id and user_id=auth.uid();
 if v_role='vampire' then select coalesce(jsonb_agg(jsonb_build_object('user_id',p.user_id,'name',p.display_name)),'[]'::jsonb) into v_all from public.sohvia_vampir_players p join private.sohvia_vampir_secret_roles r using(room_id,user_id) where p.room_id=p_room_id and r.role='vampire'; end if;
 return jsonb_build_object('role',v_role,'is_alive',v_me.is_alive,'team',case when v_role='vampire' then 'vampires' else 'village' end,'vampire_team',coalesce(v_all,'[]'::jsonb));
end $$;

create or replace function public.sohvia_vampir_action(p_room_id uuid,p_action text,p_target uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_room public.sohvia_vampir_rooms; v_me public.sohvia_vampir_players; v_target public.sohvia_vampir_players; v_role text;
begin
 select * into v_room from public.sohvia_vampir_rooms where id=p_room_id for update;
 select * into v_me from public.sohvia_vampir_players where room_id=p_room_id and user_id=auth.uid();
 if not found or not v_me.is_alive then raise exception 'Hayatta olan oda oyuncusu olmalısın.'; end if;
 select role into v_role from private.sohvia_vampir_secret_roles where room_id=p_room_id and user_id=auth.uid();
 if p_action not in ('attack','protect','investigate','vote','pass') then raise exception 'Geçersiz hamle.'; end if;
 if p_target is not null then select * into v_target from public.sohvia_vampir_players where room_id=p_room_id and user_id=p_target and is_alive; if not found then raise exception 'Hedef oyuncu geçerli değil.'; end if; end if;
 if p_action='vote' then if v_room.phase<>'voting' then raise exception 'Şu an oylama yok.'; end if;
 elsif v_room.phase<>'night' then raise exception 'Gece hamlesi için gece fazı olmalı.'; end if;
 if p_action='attack' and v_role<>'vampire' then raise exception 'Bu rol saldırı yapamaz.'; end if;
 if p_action='protect' and v_role not in ('police','doctor') then raise exception 'Bu rol koruma yapamaz.'; end if;
 if p_action='investigate' and v_role<>'seer' then raise exception 'Bu rol araştırma yapamaz.'; end if;
 if p_action='vote' and v_me.is_alive=false then raise exception 'Elendin.'; end if;
 if p_target=auth.uid() and p_action in ('attack','investigate','vote') then raise exception 'Kendini hedefleyemezsin.'; end if;
 insert into public.sohvia_vampir_actions(room_id,round_no,actor_user_id,action_type,target_user_id) values(p_room_id,v_room.round_no,auth.uid(),p_action,p_target)
 on conflict(room_id,round_no,actor_user_id,action_type) do update set target_user_id=excluded.target_user_id,created_at=now();
 return jsonb_build_object('accepted',true);
end $$;

create or replace function public.sohvia_vampir_advance(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_room public.sohvia_vampir_rooms; v_alive int; v_vamps int; v_target uuid; v_protected uuid; v_votes uuid; v_top int; v_ties int; v_winner text;
begin
 select * into v_room from public.sohvia_vampir_rooms where id=p_room_id for update;
 if v_room.host_user_id<>auth.uid() then raise exception 'Fazı yalnızca oda sahibi ilerletebilir.'; end if;
 if v_room.phase_ends_at>now() then raise exception 'Tur süresi henüz bitmedi.'; end if;
 if v_room.phase='night' then
   select target_user_id into v_target from public.sohvia_vampir_actions where room_id=p_room_id and round_no=v_room.round_no and action_type='attack' group by target_user_id order by count(*) desc limit 1;
   select target_user_id into v_protected from public.sohvia_vampir_actions where room_id=p_room_id and round_no=v_room.round_no and action_type='protect' order by created_at desc limit 1;
   if v_target is not null and v_target<>v_protected then update public.sohvia_vampir_players set is_alive=false where room_id=p_room_id and user_id=v_target; end if;
   update public.sohvia_vampir_rooms set phase='discussion',phase_ends_at=now()+interval '120 seconds',public_state=jsonb_build_object('message',case when v_target is null or v_target=v_protected then 'Köyde bu gece kimse kaybolmadı.' else 'Sabah oldu. Köy meydanında toplanın.' end),updated_at=now() where id=p_room_id;
 elsif v_room.phase='discussion' then
   update public.sohvia_vampir_rooms set phase='voting',phase_ends_at=now()+interval '45 seconds',updated_at=now() where id=p_room_id;
 elsif v_room.phase='voting' then
   select target_user_id,count(*) into v_votes,v_top from public.sohvia_vampir_actions where room_id=p_room_id and round_no=v_room.round_no and action_type='vote' and target_user_id is not null group by target_user_id order by count(*) desc limit 1;
   select count(*) into v_ties from (select target_user_id,count(*) c from public.sohvia_vampir_actions where room_id=p_room_id and round_no=v_room.round_no and action_type='vote' and target_user_id is not null group by target_user_id having count(*)=coalesce(v_top,0)) q;
   if v_ties=1 and v_votes is not null then update public.sohvia_vampir_players set is_alive=false where room_id=p_room_id and user_id=v_votes; end if;
   select count(*) into v_alive from public.sohvia_vampir_players where room_id=p_room_id and is_alive;
   select count(*) into v_vamps from public.sohvia_vampir_players p join private.sohvia_vampir_secret_roles r using(room_id,user_id) where p.room_id=p_room_id and p.is_alive and r.role='vampire';
   if v_vamps=0 then v_winner:='village'; elsif v_vamps>=v_alive-v_vamps then v_winner:='vampires'; end if;
   if v_winner is not null then update public.sohvia_vampir_rooms set status='finished',phase='finished',winner=v_winner,phase_ends_at=null,public_state=jsonb_build_object('message',case when v_winner='village' then 'Köylüler kazandı!' else 'Vampirler köyü ele geçirdi!' end),updated_at=now() where id=p_room_id;
   else update public.sohvia_vampir_rooms set phase='night',round_no=round_no+1,phase_ends_at=now()+interval '45 seconds',public_state=jsonb_build_object('message','Gece yeniden çöktü.'),updated_at=now() where id=p_room_id; end if;
 else raise exception 'Bu faz ilerletilemez.'; end if;
 return jsonb_build_object('ok',true,'next_phase',case when v_winner is not null then 'finished' when v_room.phase='night' then 'discussion' when v_room.phase='discussion' then 'voting' else 'night' end,'winner',v_winner);
end $$;

revoke all on function public.sohvia_vampir_create_room(int,text),public.sohvia_vampir_join_room(text,text),public.sohvia_vampir_start(uuid),public.sohvia_vampir_my_role(uuid),public.sohvia_vampir_action(uuid,text,uuid),public.sohvia_vampir_advance(uuid) from public,anon;
grant execute on function public.sohvia_vampir_create_room(int,text),public.sohvia_vampir_join_room(text,text),public.sohvia_vampir_start(uuid),public.sohvia_vampir_my_role(uuid),public.sohvia_vampir_action(uuid,text,uuid),public.sohvia_vampir_advance(uuid) to authenticated;
alter publication supabase_realtime add table public.sohvia_vampir_rooms;
alter publication supabase_realtime add table public.sohvia_vampir_players;
