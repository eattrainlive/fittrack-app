-- Protein drinks / RTD shakes — official grocer labels (Tesco, Morrisons, Ocado).
-- Macros are PER 100ml (drinks). Category 'Drinks'. Re-runnable for these rows.
delete from public.foods where category = 'Drinks' and brand in ('UFIT','Arla','Barebells','Grenade');

insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$High Protein Milkshake White Chocolate$f$,$f$UFIT$f$,46,7.6,3.6,0.1,NULL,$f$1 bottle (330ml)$f$,330,$f$Drinks$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Pro50 Protein Drink Strawberry$f$,$f$UFIT$f$,56,10.0,3.7,0.1,NULL,$f$1 bottle (500ml)$f$,500,$f$Drinks$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Protein Chocolate Milk Shake$f$,$f$Arla$f$,51,5.7,4.9,0.9,NULL,$f$1 bottle (482ml)$f$,482,$f$Drinks$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Protein Milkshake Chocolate$f$,$f$Barebells$f$,55,7.3,3.5,1.3,NULL,$f$1 bottle (330ml)$f$,330,$f$Drinks$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Carb Killa Shake Fudge Brownie$f$,$f$Grenade$f$,60,7.4,2.7,2.2,NULL,$f$1 bottle (330ml)$f$,330,$f$Drinks$f$,true);
