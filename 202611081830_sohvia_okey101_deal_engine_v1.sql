-- 101 Okey first playable milestone: server-authoritative 106-tile deal.
create table if not exists public.sohvia_game_player_hands (
 room_id uuid not null references public.sohvia_game_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 tiles jsonb not null default '[]'::jsonb,
 updated_at timestamptz not null default now(),
 primary key(room_id,user_id)
);
alter table public.sohvia_game_player_hands enable row level security;
drop policy if exists "players read own hand" on public.sohvia_game_player_hands;
create policy "players read own hand" on public.sohvia_game_player_hands
 for select to authenticated using(user_id=(select auth.uid()) and public.sohvia_is_game_room_member(room_id));
revoke all on public.sohvia_game_player_hands from anon,authenticated;
grant select on public.sohvia_game_player_hands to authenticated;
create table if not exists private.sohvia_game_stock (
 room_id uuid primary key references public.sohvia_game_rooms(id) on delete cascade,
 tiles jsonb not null default '[]'::jsonb
);
revoke all on private.sohvia_game_stock from public,anon,authenticated;
create or replace function public.sohvia_start_101_game(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid(); v_room public.sohvia_game_rooms; v_players uuid[]; v_deck jsonb; v_stock jsonb; v_hand jsonb; v_count int; v_seat int; v_user uuid; v_first int; v_last int;
begin
 if v_uid is null then raise exception 'Giriş yapmalısın.'; end if;
 select * into v_room from public.sohvia_game_rooms where id=p_room_id for update;
 if not found then raise exception 'Oda bulunamadı.'; end if;
 if v_room.game_slug<>'okey-101' then raise exception 'Bu oyun 101 Okey değil.'; end if;
 if v_room.host_user_id<>v_uid then raise exception 'Oyunu yalnızca oda sahibi başlatabilir.'; end if;
 if v_room.status<>'waiting' then raise exception 'Oyun zaten başlamış.'; end if;
 select array_agg(user_id order by seat_no),count(*) into v_players,v_count from public.sohvia_game_room_players where room_id=p_room_id;
 if v_count<>4 then raise exception '101 Okey başlamak için 4 oyuncu gerekli.'; end if;
 select jsonb_agg(tile order by random()) into v_deck from (
  select jsonb_build_object('id',gen_random_uuid(),'color',c.color,'number',n,'copy',cp) tile
  from (values ('red'),('blue'),('black'),('yellow')) c(color) cross join generate_series(1,13) n cross join generate_series(1,2) cp
  union all select jsonb_build_object('id',gen_random_uuid(),'color','joker','number',0,'copy',cp) from generate_series(1,2) cp
 ) d;
 delete from public.sohvia_game_player_hands where room_id=p_room_id;
 for v_seat in 1..4 loop
  v_user:=v_players[v_seat];
  v_first:=case when v_seat=1 then 1 else 23+(v_seat-2)*21 end;
  v_last:=v_first+case when v_seat=1 then 21 else 20 end;
  select coalesce(jsonb_agg(e.value order by e.ord),'[]'::jsonb) into v_hand
  from jsonb_array_elements(v_deck) with ordinality e(value,ord) where e.ord between v_first and v_last;
  insert into public.sohvia_game_player_hands(room_id,user_id,tiles) values(p_room_id,v_user,v_hand);
 end loop;
 select coalesce(jsonb_agg(e.value order by e.ord),'[]'::jsonb) into v_stock from jsonb_array_elements(v_deck) with ordinality e(value,ord) where e.ord>85;
 insert into private.sohvia_game_stock(room_id,tiles) values(p_room_id,v_stock) on conflict(room_id) do update set tiles=excluded.tiles;
 update public.sohvia_game_rooms set status='playing',current_turn_user_id=v_players[1],
 game_state=jsonb_build_object('engine','okey101_v1','started_at',now(),'stock_count',jsonb_array_length(v_stock),'discard_pile','[]'::jsonb,'turn_number',1,'dealer_user_id',v_players[1]),
 updated_at=now() where id=p_room_id;
 return jsonb_build_object('status','playing','players',4,'stock_count',jsonb_array_length(v_stock));
end $$;
revoke all on function public.sohvia_start_101_game(uuid) from public,anon;
grant execute on function public.sohvia_start_101_game(uuid) to authenticated;
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sohvia_game_player_hands') then
  alter publication supabase_realtime add table public.sohvia_game_player_hands;
 end if;
end $$;
