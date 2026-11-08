create extension if not exists pgcrypto;
create table if not exists public.sohvia_chess_matches(
 id uuid primary key default gen_random_uuid(),
 room_code text not null unique,
 white_user uuid not null references auth.users(id),
 black_user uuid references auth.users(id),
 fen text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
 moves jsonb not null default '[]'::jsonb,
 status text not null default 'waiting' check(status in ('waiting','playing','finished')),
 result text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.sohvia_chess_matches enable row level security;
create policy "chess participants read match" on public.sohvia_chess_matches for select to authenticated using(white_user=auth.uid() or black_user=auth.uid());
grant select on public.sohvia_chess_matches to authenticated;
create or replace function public.sohvia_chess_create()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_code text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 loop v_code:=upper(substr(encode(gen_random_bytes(4),'hex'),1,6)); exit when not exists(select 1 from public.sohvia_chess_matches where room_code=v_code); end loop;
 insert into public.sohvia_chess_matches(room_code,white_user) values(v_code,auth.uid()) returning id into v_id;
 return jsonb_build_object('match_id',v_id,'room_code',v_code);
end $$;
create or replace function public.sohvia_chess_join(p_code text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.sohvia_chess_matches;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v from public.sohvia_chess_matches where room_code=upper(trim(p_code)) for update;
 if not found then raise exception 'ROOM_NOT_FOUND'; end if;
 if v.white_user=auth.uid() then return jsonb_build_object('match_id',v.id); end if;
 if v.black_user is not null then raise exception 'ROOM_FULL'; end if;
 update public.sohvia_chess_matches set black_user=auth.uid(),status='playing',updated_at=now() where id=v.id;
 return jsonb_build_object('match_id',v.id);
end $$;
create or replace function public.sohvia_chess_move(p_match_id uuid,p_expected_fen text,p_uci text,p_new_fen text,p_san text)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.sohvia_chess_matches; v_turn text;
begin
 select * into v from public.sohvia_chess_matches where id=p_match_id for update;
 if not found or auth.uid() not in (v.white_user,v.black_user) then raise exception 'NOT_MATCH_MEMBER'; end if;
 if v.status<>'playing' then raise exception 'MATCH_NOT_PLAYING'; end if;
 if v.fen<>p_expected_fen then raise exception 'STALE_POSITION_REFRESH'; end if;
 v_turn:=split_part(v.fen,' ',2);
 if (v_turn='w' and auth.uid()<>v.white_user) or (v_turn='b' and auth.uid()<>v.black_user) then raise exception 'NOT_YOUR_TURN'; end if;
 if length(p_uci) not between 4 and 5 or length(p_new_fen)<20 then raise exception 'INVALID_MOVE_PAYLOAD'; end if;
 update public.sohvia_chess_matches set fen=p_new_fen,moves=moves||jsonb_build_array(jsonb_build_object('uci',p_uci,'san',p_san,'by',auth.uid())),updated_at=now() where id=p_match_id;
 return true;
end $$;
create or replace function public.sohvia_chess_resign(p_match_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.sohvia_chess_matches;
begin
 select * into v from public.sohvia_chess_matches where id=p_match_id for update;
 if not found or auth.uid() not in (v.white_user,v.black_user) then raise exception 'NOT_MATCH_MEMBER'; end if;
 update public.sohvia_chess_matches set status='finished',result=case when auth.uid()=white_user then 'Black wins by resignation' else 'White wins by resignation' end,updated_at=now() where id=p_match_id;
 return true;
end $$;
revoke all on function public.sohvia_chess_create() from public,anon;
revoke all on function public.sohvia_chess_join(text) from public,anon;
revoke all on function public.sohvia_chess_move(uuid,text,text,text,text) from public,anon;
revoke all on function public.sohvia_chess_resign(uuid) from public,anon;
grant execute on function public.sohvia_chess_create(),public.sohvia_chess_join(text),public.sohvia_chess_move(uuid,text,text,text,text),public.sohvia_chess_resign(uuid) to authenticated;

do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')
 and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sohvia_chess_matches') then
   alter publication supabase_realtime add table public.sohvia_chess_matches;
 end if;
end $$;
