-- Remove duplicate chat rooms, keeping the earliest record per order
WITH ranked_rooms AS (
  SELECT
    id,
    order_id,
    ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY created_at ASC, id ASC) AS rn
  FROM design_chat_rooms
)
DELETE FROM design_chat_rooms
WHERE id IN (
  SELECT id
  FROM ranked_rooms
  WHERE rn > 1
);

-- Optional: report remaining duplicates (should be zero)
SELECT order_id,
       COUNT(*) AS room_count
FROM design_chat_rooms
GROUP BY order_id
HAVING COUNT(*) > 1;


























