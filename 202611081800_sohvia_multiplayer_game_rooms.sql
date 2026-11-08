create table if not exists public.sohvia_game_rooms (
 id uuid primary key default gen_random_uuid(), room_code text not null unique,
 game_slug text not null references public.game_catalog(slug) on update cascade,
 host_user_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'waiting' check(status in ('waiting','playing','finished','cancelled')),
 max_players int not null default 2 check(max_players between 2 and 4),
 game_state jsonb not null default '{}'::jsonb,
 current_turn_user_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.sohvia_game_room_players (
 room_id uuid not null references public.sohvia_game_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 seat_no int not null check(seat_no between 1 and 4), joined_at timestamptz not null default now(),
 is_ready boolean not null default false, primary key(room_id,user_id), unique(room_id,seat_no)
);
alter table public.sohvia_game_rooms enable row level security;
alter table public.sohvia_game_room_players enable row level security;
create or replace function public.sohvia_is_game_room_member(p_room_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.sohvia_game_room_players p where p.room_id=p_room_id and p.user_id=(select auth.uid())) $$;
revoke all on function public.sohvia_is_game_room_member(uuid) from public,anon;
grant execute on function public.sohvia_is_game_room_member(uuid) to authenticated;
create policy "room members can view rooms" on public.sohvia_game_rooms for select to authenticated
 using(public.sohvia_is_game_room_member(id));
create policy "players can view room players" on public.sohvia_game_room_players for select to authenticated
 using(public.sohvia_is_game_room_member(room_id));
revoke all on public.sohvia_game_rooms,public.sohvia_game_room_players from anon,authenticated;
grant select on public.sohvia_game_rooms,public.sohvia_game_room_players to authenticated;
create or replace function public.sohvia_create_game_room(p_game_slug text,p_max_players int default 2)
returns public.sohvia_game_rooms language plpgsql security definer set search_path=''
as $$ declare v_room public.sohvia_game_rooms; v_code text; begin
 if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
 if p_max_players<2 or p_max_players>4 then raise exception 'Oyuncu sayısı 2-4 olmalı.'; end if;
 if not exists(select 1 from public.game_catalog g where g.slug=p_game_slug and g.is_active=true) then raise exception 'Oyun aktif değil.'; end if;
 loop v_code:=upper(substr(encode(gen_random_bytes(4),'hex'),1,6)); exit when not exists(select 1 from public.sohvia_game_rooms r where r.room_code=v_code and r.status in('waiting','playing')); end loop;
 insert into public.sohvia_game_rooms(room_code,game_slug,host_user_id,max_players) values(v_code,p_game_slug,auth.uid(),p_max_players) returning * into v_room;
 insert into public.sohvia_game_room_players(room_id,user_id,seat_no) values(v_room.id,auth.uid(),1); return v_room; end $$;
create or replace function public.sohvia_join_game_room(p_room_code text)
returns public.sohvia_game_rooms language plpgsql security definer set search_path=''
as $$ declare v_room public.sohvia_game_rooms; v_seat int; begin
 if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
 select * into v_room from public.sohvia_game_rooms where room_code=upper(trim(p_room_code)) and status='waiting' for update;
 if not found then raise exception 'Oda bulunamadı veya oyun başlamış.'; end if;
 if exists(select 1 from public.sohvia_game_room_players where room_id=v_room.id and user_id=auth.uid()) then return v_room; end if;
 select coalesce(max(seat_no),0)+1 into v_seat from public.sohvia_game_room_players where room_id=v_room.id;
 if v_seat>v_room.max_players then raise exception 'Oda dolu.'; end if;
 insert into public.sohvia_game_room_players(room_id,user_id,seat_no) values(v_room.id,auth.uid(),v_seat); return v_room; end $$;
create or replace function public.sohvia_leave_game_room(p_room_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$ declare v_host uuid; v_count int; begin
 delete from public.sohvia_game_room_players where room_id=p_room_id and user_id=auth.uid();
 select host_user_id into v_host from public.sohvia_game_rooms where id=p_room_id;
 select count(*) into v_count from public.sohvia_game_room_players where room_id=p_room_id;
 if v_count=0 then delete from public.sohvia_game_rooms where id=p_room_id;
 elsif v_host=auth.uid() then update public.sohvia_game_rooms set status='cancelled',updated_at=now() where id=p_room_id and status='waiting'; end if;
 return true; end $$;
revoke all on function public.sohvia_create_game_room(text,int),public.sohvia_join_game_room(text),public.sohvia_leave_game_room(uuid) from public,anon;
grant execute on function public.sohvia_create_game_room(text,int),public.sohvia_join_game_room(text),public.sohvia_leave_game_room(uuid) to authenticated;
alter publication supabase_realtime add table public.sohvia_game_rooms;
alter publication supabase_realtime add table public.sohvia_game_room_players;
