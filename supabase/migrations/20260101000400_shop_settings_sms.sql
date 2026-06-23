-- Add outbound SMS (Infobip) settings to the shop configuration row.
alter table shop_settings add column if not exists sms jsonb not null default '{}';
