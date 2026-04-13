-- ==========================================
-- 1. ADMIN FUNCTIONS
-- ==========================================

-- Function to delete a user from auth.users (requires high permissions)
create or replace function public.admin_delete_user(user_id_to_delete uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Delete from auth.users (this will also delete from profiles due to ON DELETE CASCADE)
  delete from auth.users where id = user_id_to_delete;
end;
$$;

-- Grant access to the function
grant execute on function public.admin_delete_user(uuid) to authenticated;
grant execute on function public.admin_delete_user(uuid) to service_role;


-- ==========================================
-- 2. TABLES AND TRIGGERS
-- ==========================================

-- Profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  full_name text,
  role text check (role in ('admin', 'technician')),
  dp_no text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Trigger function to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name, role, dp_no)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'role',
    new.raw_user_meta_data->>'dp_no'
  );
  return new;
end;
$$;

-- Create the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ==========================================
-- 3. OTHER TABLES (In case they are missing)
-- ==========================================

-- Motors table
create table if not exists public.motors (
  id uuid default gen_random_uuid() primary key,
  sl_no integer not null,
  plant text not null,
  equipment_name text not null,
  reason text,
  date date default current_date,
  make text,
  kw numeric,
  hp numeric,
  rpm integer,
  condition text check (condition in ('Running', 'Repair', 'Rewind', 'Replacement', 'Standby', 'Faulty')),
  mounting text,
  last_updated timestamp with time zone default now(),
  category text check (category in ('general', 'powerhouse')),
  unique(sl_no, category)
);

-- Maintenance History
create table if not exists public.maintenance_history (
  id uuid default gen_random_uuid() primary key,
  motor_id uuid references public.motors on delete cascade,
  action_type text check (action_type in ('Repair', 'Rewind', 'Replacement')),
  reason text,
  date date default current_date,
  technician_id uuid references auth.users,
  remarks text,
  category text check (category in ('general', 'powerhouse'))
);

-- Attendance
create table if not exists public.attendance (
  id uuid default gen_random_uuid() primary key,
  technician_id uuid references auth.users on delete cascade,
  date date not null,
  status text check (status in ('A', 'B', 'C', 'D', 'H', 'L', 'OD', 'OFF', 'AB')),
  marked_by uuid references auth.users,
  marked_time timestamp with time zone default now(),
  unique(technician_id, date)
);

-- Notifications
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  motor_id uuid references public.motors on delete cascade,
  alert_message text not null,
  date timestamp with time zone default now(),
  status text default 'Unseen' check (status in ('Seen', 'Unseen')),
  recipient_role text default 'Both' check (recipient_role in ('Admin', 'Technician', 'Both')),
  category text check (category in ('general', 'powerhouse'))
);

-- Enable RLS for all
alter table public.motors enable row level security;
alter table public.maintenance_history enable row level security;
alter table public.attendance enable row level security;
alter table public.notifications enable row level security;

-- Simple policies (Adjust according to your needs)
create policy "Authenticated users can read all" on public.motors for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read history" on public.maintenance_history for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read attendance" on public.attendance for select using (auth.role() = 'authenticated');
create policy "Authenticated users can read notifications" on public.notifications for select using (auth.role() = 'authenticated');

-- Admin write policies
create policy "Admins can manage everything" on public.motors for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
-- ... (and so on for other tables)
