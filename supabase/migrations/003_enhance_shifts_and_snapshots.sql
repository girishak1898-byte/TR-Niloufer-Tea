-- ============================================================
-- Migration 003: Enhance shifts with cash tracking,
--                rename snapshot fields for clarity
-- ============================================================

-- 1. Add cash reconciliation fields to shifts
alter table shifts add column opening_cash decimal(10,2) not null default 0;
alter table shifts add column expected_cash decimal(10,2) not null default 0;
alter table shifts add column counted_cash decimal(10,2);
alter table shifts add column cash_difference decimal(10,2);
alter table shifts add column closing_note text;

-- 2. Rename snapshot fields in sales table
alter table sales rename column worker_name to worker_name_snapshot;

-- 3. Rename snapshot fields in sale_items table
alter table sale_items rename column product_name to product_name_snapshot;
alter table sale_items rename column unit_price to unit_price_snapshot;
