/*
  # Create function to get distinct months with quotas

  This function returns distinct year-month combinations from quotas_mensais table,
  ensuring no duplicate months are returned regardless of how many quotas exist for that month.

  1. New Functions
    - `get_distinct_months()` - Returns distinct months in YYYY-MM format
*/

CREATE OR REPLACE FUNCTION get_distinct_months()
RETURNS TABLE(mes_ano text) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT 
    TO_CHAR(mes, 'YYYY-MM') as mes_ano
  FROM quotas_mensais
  WHERE mes IS NOT NULL
  ORDER BY mes_ano DESC;
END;
$$ LANGUAGE plpgsql STABLE;