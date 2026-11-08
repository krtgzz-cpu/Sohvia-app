-- SOHVIA random video chat: queue, call membership, WebRTC signaling.
-- Adult verification must be written only by a trusted server/admin workflow after age review.
create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists private.sohvia_adult_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  verified_18_plus boolean not null default false,
  verified_at timestamptz,
  verification_method text
);
alter table private.sohvia_adult_verifications enable row level security;

create table if not exists public.sohvia_video_queue (
  user_id uuid primary key references auth.users(id) on delete cascade,
  queued_at timestamptz not null default now()
);
alter table public.sohvia_video_queue enable row level security;
revoke all on public.sohvia_video_queue from anon, authenticated;

create table if not exists public.sohvia_video_calls (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active' check (status in ('active','ended')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
alter table public.sohvia_video_calls enable row level security;

create table if not exists public.sohvia_video_call_members (
  call_id uuid not null references public.sohvia_video_calls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_initiator boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key(call_id,user_id)
);
alter table public.sohvia_video_call_members enable row level security;

create table if not exists public.sohvia_video_signals (
  id bigint generated always as identity primary key,
  call_id uuid not null references public.sohvia_video_calls(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  signal_type text not null check(signal_type in ('offer','answer','ice','hangup')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.sohvia_video_signals enable row level security;

create or replace function private.sohvia_is_video_member(p_call_id uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.sohvia_video_call_members where call_id=p_call_id and user_id=auth.uid())
$$;
revoke all on function private.sohvia_is_video_member(uuid) from public,anon;
grant execute on function private.sohvia_is_video_member(uuid) to authenticated;

create policy "video members read own calls" on public.sohvia_video_calls
for select to authenticated using (
  private.sohvia_is_video_member(id)
);
create policy "video members read call members" on public.sohvia_video_call_members
for select to authenticated using (
  private.sohvia_is_video_member(call_id)
);
create policy "video participants read signals" on public.sohvia_video_signals
for select to authenticated using (
  private.sohvia_is_video_member(sohvia_video_signals.call_id)
);
create policy "video participants send signals" on public.sohvia_video_signals
for insert to authenticated with check (
  sender_id=auth.uid()
  and exists(select 1 from public.sohvia_video_calls c where c.id=call_id and c.status='active')
  and private.sohvia_is_video_member(sohvia_video_signals.call_id)
);
grant select on public.sohvia_video_calls, public.sohvia_video_call_members, public.sohvia_video_signals to authenticated;
grant insert on public.sohvia_video_signals to authenticated;
grant usage,select on sequence public.sohvia_video_signals_id_seq to authenticated;

create or replace function public.sohvia_video_match_random()
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_user uuid:=auth.uid(); v_other uuid; v_call uuid; v_adult boolean; v_initiator boolean;
begin
 if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
 select coalesce(verified_18_plus,false) into v_adult from private.sohvia_adult_verifications where user_id=v_user;
 if not coalesce(v_adult,false) then raise exception 'AGE_18_VERIFICATION_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended('sohvia_video_matching',0));
 select c.id,m.is_initiator into v_call,v_initiator
 from public.sohvia_video_call_members m join public.sohvia_video_calls c on c.id=m.call_id
 where m.user_id=v_user and c.status='active' order by c.created_at desc limit 1;
 if v_call is not null then
   return jsonb_build_object('waiting',false,'call_id',v_call,'is_initiator',v_initiator);
 end if;
 delete from public.sohvia_video_queue q where q.queued_at < now()-interval '3 minutes';
 delete from public.sohvia_video_queue where user_id=v_user;
 select q.user_id into v_other
 from public.sohvia_video_queue q
 join private.sohvia_adult_verifications a on a.user_id=q.user_id and a.verified_18_plus
 where q.user_id<>v_user
 order by q.queued_at
 for update of q skip locked limit 1;
 if v_other is null then
   insert into public.sohvia_video_queue(user_id) values(v_user);
   return jsonb_build_object('waiting',true);
 end if;
 delete from public.sohvia_video_queue where user_id in (v_user,v_other);
 insert into public.sohvia_video_calls default values returning id into v_call;
 insert into public.sohvia_video_call_members(call_id,user_id,is_initiator) values
   (v_call,v_user,true),(v_call,v_other,false);
 return jsonb_build_object('waiting',false,'call_id',v_call,'is_initiator',true);
end $$;

create or replace function public.sohvia_video_end_call(p_call_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not exists(select 1 from public.sohvia_video_call_members where call_id=p_call_id and user_id=auth.uid()) then
   raise exception 'NOT_CALL_MEMBER';
 end if;
 update public.sohvia_video_calls set status='ended',ended_at=now() where id=p_call_id and status='active';
 delete from public.sohvia_video_queue where user_id=auth.uid();
 return true;
end $$;

revoke all on function public.sohvia_video_match_random() from public,anon;
revoke all on function public.sohvia_video_end_call(uuid) from public,anon;
grant execute on function public.sohvia_video_match_random() to authenticated;
grant execute on function public.sohvia_video_end_call(uuid) to authenticated;

-- Safety additions: private block list, reports, and queue cancellation.
create table if not exists private.sohvia_video_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_id, blocked_id),
  check(blocker_id <> blocked_id)
);
alter table private.sohvia_video_blocks enable row level security;
revoke all on private.sohvia_video_blocks from public, anon, authenticated;

create table if not exists private.sohvia_video_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  call_id uuid not null references public.sohvia_video_calls(id) on delete cascade,
  reason text not null check(reason in ('harassment','sexual_content','fake_or_scam','other')),
  details text not null default '',
  created_at timestamptz not null default now(),
  status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed'))
);
alter table private.sohvia_video_reports enable row level security;
revoke all on private.sohvia_video_reports from public, anon, authenticated;

create or replace function public.sohvia_video_leave_queue()
returns boolean language plpgsql security definer set search_path=public,private,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  delete from public.sohvia_video_queue where user_id=auth.uid();
  return true;
end $$;

create or replace function public.sohvia_video_block_user(p_blocked_user_id uuid)
returns boolean language plpgsql security definer set search_path=public,private,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_blocked_user_id is null or p_blocked_user_id=auth.uid() then raise exception 'INVALID_USER'; end if;
  insert into private.sohvia_video_blocks(blocker_id,blocked_id)
  values(auth.uid(),p_blocked_user_id) on conflict do nothing;
  delete from public.sohvia_video_queue where user_id=p_blocked_user_id;
  return true;
end $$;

create or replace function public.sohvia_video_report_user(
  p_reported_user_id uuid, p_call_id uuid, p_reason text, p_details text default ''
) returns uuid language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_report uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_reason not in ('harassment','sexual_content','fake_or_scam','other') then raise exception 'INVALID_REASON'; end if;
  if not exists(select 1 from public.sohvia_video_call_members where call_id=p_call_id and user_id=auth.uid())
     or not exists(select 1 from public.sohvia_video_call_members where call_id=p_call_id and user_id=p_reported_user_id)
     or p_reported_user_id=auth.uid() then raise exception 'NOT_CALL_MEMBER'; end if;
  insert into private.sohvia_video_reports(reporter_id,reported_user_id,call_id,reason,details)
  values(auth.uid(),p_reported_user_id,p_call_id,p_reason,left(coalesce(p_details,''),1000)) returning id into v_report;
  insert into private.sohvia_video_blocks(blocker_id,blocked_id) values(auth.uid(),p_reported_user_id) on conflict do nothing;
  return v_report;
end $$;

-- Do not pair accounts that have blocked one another.
create or replace function public.sohvia_video_match_random()
returns jsonb language plpgsql security definer set search_path=public,private,pg_temp as $$
declare v_user uuid:=auth.uid(); v_other uuid; v_call uuid; v_adult boolean; v_initiator boolean;
begin
 if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
 select coalesce(verified_18_plus,false) into v_adult from private.sohvia_adult_verifications where user_id=v_user;
 if not coalesce(v_adult,false) then raise exception 'AGE_18_VERIFICATION_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended('sohvia_video_matching',0));
 select c.id,m.is_initiator into v_call,v_initiator
 from public.sohvia_video_call_members m join public.sohvia_video_calls c on c.id=m.call_id
 where m.user_id=v_user and c.status='active' order by c.created_at desc limit 1;
 if v_call is not null then return jsonb_build_object('waiting',false,'call_id',v_call,'is_initiator',v_initiator); end if;
 delete from public.sohvia_video_queue q where q.queued_at < now()-interval '3 minutes';
 delete from public.sohvia_video_queue where user_id=v_user;
 select q.user_id into v_other
 from public.sohvia_video_queue q
 join private.sohvia_adult_verifications a on a.user_id=q.user_id and a.verified_18_plus
 where q.user_id<>v_user
 and not exists(select 1 from private.sohvia_video_blocks b where b.blocker_id=v_user and b.blocked_id=q.user_id)
 and not exists(select 1 from private.sohvia_video_blocks b where b.blocker_id=q.user_id and b.blocked_id=v_user)
 order by q.queued_at limit 1 for update of q skip locked;
 if v_other is null then
   insert into public.sohvia_video_queue(user_id) values(v_user);
   return jsonb_build_object('waiting',true);
 end if;
 delete from public.sohvia_video_queue where user_id in (v_user,v_other);
 insert into public.sohvia_video_calls default values returning id into v_call;
 insert into public.sohvia_video_call_members(call_id,user_id,is_initiator) values(v_call,v_user,true),(v_call,v_other,false);
 return jsonb_build_object('waiting',false,'call_id',v_call,'is_initiator',true);
end $$;

revoke all on function public.sohvia_video_leave_queue() from public,anon;
revoke all on function public.sohvia_video_block_user(uuid) from public,anon;
revoke all on function public.sohvia_video_report_user(uuid,uuid,text,text) from public,anon;
grant execute on function public.sohvia_video_leave_queue() to authenticated;
grant execute on function public.sohvia_video_block_user(uuid) to authenticated;
grant execute on function public.sohvia_video_report_user(uuid,uuid,text,text) to authenticated;

-- Realtime delivery for WebRTC signaling rows.
do $$ begin
  alter publication supabase_realtime add table public.sohvia_video_signals;
exception when duplicate_object then null;
end $$;
