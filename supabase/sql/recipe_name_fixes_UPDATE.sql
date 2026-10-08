-- Fix two recipes whose titles were misread as "POINTS" by the original OCR.
update public.recipes set name=$r$Chicken Cobb Salad$r$
  where name=$r$POINTS$r$ and band=500 and image_url not like $x$%abook-%$x$;
update public.recipes set name=$r$Lamb & Sweet Potato Bake$r$
  where name=$r$POINTS$r$ and band=600 and image_url not like $x$%abook-%$x$;
