-- Supermarket / branded protein yoghurts — official grocer labels (Tesco, Morrisons, Arla).
-- Per 100g. Re-runnable for these rows.
delete from public.foods where brand in ('Tesco','Morrisons','Arla') and category = 'Dairy & eggs';

insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$High Protein Natural Yogurt$f$,$f$Tesco$f$,65,11.3,3.9,0.4,0.4,$f$1/2 pot (200g)$f$,200,$f$Dairy & eggs$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$High Protein Vanilla Yogurt$f$,$f$Tesco$f$,84,10.0,9.9,0.4,0.4,$f$1 pot (200g)$f$,200,$f$Dairy & eggs$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Protein Fat Free Natural Yogurt$f$,$f$Morrisons$f$,66,11.0,4.2,0.5,0.5,$f$1/4 pot (125g)$f$,125,$f$Dairy & eggs$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Strawberry Protein Fat Free Yogurt$f$,$f$Morrisons$f$,68,10.5,5.1,0.5,0.5,$f$1 pot (200g)$f$,200,$f$Dairy & eggs$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Protein Strawberry Yogurt Pouch$f$,$f$Arla$f$,71,10.0,5.7,0.6,NULL,$f$1 pouch (200g)$f$,200,$f$Dairy & eggs$f$,true);
