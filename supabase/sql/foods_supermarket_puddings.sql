-- Protein puddings / desserts — official grocer labels (Tesco, Morrisons).
-- Per 100g. Category 'Dessert'. Re-runnable for these rows.
delete from public.foods where category = 'Dessert' and brand in ('Lindahls','Arla','Müller','Müller Rice');

insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Protein Pudding Chocolate$f$,$f$Lindahls$f$,75,10.0,7.4,0.4,NULL,$f$1 pot (140g)$f$,140,$f$Dessert$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Protein Pudding Chocolate Brownie$f$,$f$Lindahls$f$,75,10.0,7.4,0.3,NULL,$f$1 pot (140g)$f$,140,$f$Dessert$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Protein Chocolate Flavour Pudding$f$,$f$Arla$f$,74,10.0,6.6,1.5,NULL,$f$1 pot (200g)$f$,200,$f$Dessert$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$MyProtein Pudding Chocolate$f$,$f$Müller$f$,89,10.0,6.6,2.3,NULL,$f$1 pot (200g)$f$,200,$f$Dessert$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$MyProtein Pudding Vanilla$f$,$f$Müller$f$,84,10.0,6.7,1.8,NULL,$f$1 pot (200g)$f$,200,$f$Dessert$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$MyProtein Mousse Salted Caramel$f$,$f$Müller$f$,85,10.7,3.9,2.6,NULL,$f$1 pot (200g)$f$,200,$f$Dessert$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$MyProtein Mousse Chocolate$f$,$f$Müller$f$,84,10.2,3.9,2.7,NULL,$f$1 pot (200g)$f$,200,$f$Dessert$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Light Protein Pudding Chocolate Orange$f$,$f$Müller$f$,88,10.1,8.1,1.5,NULL,$f$1 pot (140g)$f$,140,$f$Dessert$f$,true);
insert into public.foods (name,brand,calories,protein,carbs,fats,fibre,serving_desc,serving_g,category,verified) values ($f$Rice Protein Chocolate$f$,$f$Müller Rice$f$,101,7.7,12.1,2.4,NULL,$f$1 pot (180g)$f$,180,$f$Dessert$f$,true);
