-- Restore the authenticated table privileges required by the Operations Center.
-- RLS policies on these tables continue to restrict access to active staff/admins.
GRANT SELECT, UPDATE ON TABLE public.bookings TO authenticated;
GRANT SELECT ON TABLE public.profiles, public.payments, public.delivery_costs TO authenticated;
GRANT INSERT ON TABLE public.delivery_costs TO authenticated;
