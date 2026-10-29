-- Per4m + Applied Nutrition — core products (batch 1).
-- Verified from retailer/label listings; rows flagged verified=false need a label check.
-- Run after foods_table.sql. Re-runnable (clears these two brands first).
delete from public.foods where brand in ('Per4m','Applied Nutrition');

insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Whey Protein$f$,$f$Per4m$f$,350,70,11,3,0,$f$1 scoop (30g)$f$,30,$f$Supplements$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Isolate Zero$f$,$f$Per4m$f$,360,87,1.7,0.7,0,$f$1 scoop (30g)$f$,30,$f$Supplements$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Protein Bar$f$,$f$Per4m$f$,320,32,39,9,2,$f$1 bar (62g)$f$,62,$f$Supplements$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Creatine Monohydrate$f$,$f$Per4m$f$,0,0,0,0,0,$f$1 scoop (5g)$f$,5,$f$Supplements$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Pre-Workout$f$,$f$Per4m$f$,0,0,0,0,0,$f$1 scoop (10g)$f$,10,$f$Supplements$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Critical Whey$f$,$f$Applied Nutrition$f$,369,71,8,6,0,$f$1 scoop (30g)$f$,30,$f$Supplements$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Clear Whey Isolate$f$,$f$Applied Nutrition$f$,361,85,4,0.5,0,$f$1 scoop (25g)$f$,25,$f$Supplements$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Micronized Creatine Monohydrate$f$,$f$Applied Nutrition$f$,0,0,0,0,0,$f$1 scoop (5g)$f$,5,$f$Supplements$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Collagen Powder$f$,$f$Applied Nutrition$f$,364,90,0,0,0,$f$1 scoop (5.5g)$f$,5.5,$f$Supplements$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$ABE Pre-Workout$f$,$f$Applied Nutrition$f$,0,0,0,0,0,$f$1 scoop (10g)$f$,10,$f$Supplements$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$ABE Energy Drink (can)$f$,$f$Applied Nutrition$f$,0,0,0,0,0,$f$1 can (330ml)$f$,330,$f$Supplements$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Protein Crunch Bar$f$,$f$Applied Nutrition$f$,317,24,37,13,2,$f$1 bar (62g)$f$,62,$f$Supplements$f$,false);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Protein Water$f$,$f$Applied Nutrition$f$,6,4,0,0,0,$f$1 can (330ml)$f$,330,$f$Supplements$f$,false);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Greens$f$,$f$Applied Nutrition$f$,360,20,50,5,10,$f$1 scoop (5g)$f$,5,$f$Supplements$f$,false);
