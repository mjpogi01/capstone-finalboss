-- Adds a unique constraint to ensure only one chat room exists per order
ALTER TABLE design_chat_rooms
ADD CONSTRAINT design_chat_rooms_order_id_key UNIQUE (order_id);

COMMENT ON CONSTRAINT design_chat_rooms_order_id_key ON design_chat_rooms
IS 'Guarantees that each order has at most one associated chat room';


























