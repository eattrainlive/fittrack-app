-- ETL high-protein low-cal recipes — batch 1 (generated, macros computed).
-- Review the CSV first. Upload the recipe-images/*.jpg to the recipe-images bucket, then run this.
-- Re-runnable: clears this batch by slug before inserting.
delete from public.recipes where image_url like '%etl-hp-%';

insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,500,$r$Protein Berry Overnight Oats$r$,423,46,50,6,8,$r$1$r$,$r$5 min + overnight$r$,$r$50g porridge oats
150g 0% Greek yoghurt
1 scoop (30g) vanilla whey
80g mixed berries
120ml water or skimmed milk$r$,$r$1. Mix the oats, yoghurt, whey and water in a jar or tub.
2. Stir in half the berries, top with the rest.
3. Cover and leave in the fridge overnight. Eat cold.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-01-protein-berry-overnight-oats.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,300,$r$Egg White & Feta Scramble Wrap$r$,292,33,19,10,7,$r$1$r$,$r$10 min$r$,$r$200g liquid egg whites
30g feta, crumbled
40g spinach
1 low-calorie wrap
Salt, pepper, chilli flakes$r$,$r$1. Wilt the spinach in a non-stick pan with a little spray oil.
2. Add the egg whites and scramble on a medium heat.
3. Stir through the feta right at the end, season.
4. Spoon into the warmed wrap and roll up.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-02-egg-white-feta-scramble-wrap.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,500,$r$Banana Protein Pancakes$r$,496,42,55,15,6,$r$1$r$,$r$15 min$r$,$r$1 banana
2 eggs
1 scoop (30g) vanilla whey
30g oats
10g maple syrup to serve$r$,$r$1. Blend the banana, eggs, whey and oats to a batter.
2. Cook small pancakes in a non-stick pan, spray oil, 1-2 min each side.
3. Stack and finish with the maple syrup.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-03-banana-protein-pancakes.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,400,$r$Smoked Salmon Scrambled Eggs on Toast$r$,376,38,16,17,2,$r$1$r$,$r$10 min$r$,$r$2 eggs
100g egg whites
50g smoked salmon
1 slice wholemeal bread
Chives, black pepper$r$,$r$1. Whisk the eggs and whites, scramble gently in a non-stick pan.
2. Fold in the smoked salmon off the heat so it just warms through.
3. Serve on the toast with chives and pepper.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-04-smoked-salmon-scrambled-eggs-on-toast.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,300,$r$Cottage Cheese & Berry Bagel$r$,259,24,35,4,6,$r$1$r$,$r$5 min$r$,$r$1 bagel thin
150g low-fat cottage cheese
60g mixed berries
5g honey$r$,$r$1. Toast the bagel thin.
2. Top with the cottage cheese, berries and a drizzle of honey.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-05-cottage-cheese-berry-bagel.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,400,$r$Mango & Skyr Protein Bowl$r$,364,49,36,4,4,$r$1$r$,$r$5 min$r$,$r$200g skyr
1 scoop (30g) vanilla whey
80g frozen mango
20g oats sprinkled on top$r$,$r$1. Stir the whey into the skyr with a splash of water until smooth.
2. Top with the mango and a sprinkle of oats.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-06-mango-skyr-protein-bowl.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Teriyaki Salmon & Rice$r$,454,33,47,15,3,$r$2$r$,$r$25 min$r$,$r$2 salmon fillets (260g)
40g teriyaki sauce
260g cooked rice
150g broccoli
50g spring onion & sesame$r$,$r$1. Coat the salmon in half the teriyaki and bake at 200C for 12-15 min.
2. Steam the broccoli and cook the rice.
3. Divide rice and broccoli between 2 bowls, add salmon.
4. Warm the rest of the teriyaki and spoon over, scatter spring onion.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-07-teriyaki-salmon-rice.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Piri Piri Chicken & Potatoes$r$,329,40,32,5,5,$r$2$r$,$r$35 min$r$,$r$300g chicken breast
20g piri piri / hot sauce
300g potatoes, diced
150g peppers
5g olive oil$r$,$r$1. Toss the diced potatoes and peppers in the oil and seasoning.
2. Air-fry or roast at 200C for 20-25 min until crisp.
3. Coat the chicken in piri piri and bake 18-20 min until cooked through.
4. Slice the chicken and serve over the potatoes and peppers.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-08-piri-piri-chicken-potatoes.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Turkey Meatballs in Tomato Sauce$r$,435,42,45,9,5,$r$3$r$,$r$30 min$r$,$r$450g lean turkey mince
1 egg to bind
500g passata
1 onion, diced
300g cooked pasta$r$,$r$1. Mix the turkey with the egg and seasoning, roll into balls.
2. Brown in a non-stick pan with spray oil, then set aside.
3. Soften the onion, add passata, simmer 10 min, return the meatballs.
4. Serve over the cooked pasta.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-09-turkey-meatballs-in-tomato-sauce.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Chicken Fajita Bowl$r$,416,43,47,6,5,$r$2$r$,$r$20 min$r$,$r$300g chicken breast, sliced
200g peppers & onion
240g cooked rice
80g chickpeas, drained
Fajita spice, 5g olive oil$r$,$r$1. Fry the chicken with the fajita spice until cooked.
2. Add the peppers and onion, cook until just soft.
3. Build bowls with rice, the fajita mix and the chickpeas.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-10-chicken-fajita-bowl.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Beef & Broccoli Stir Fry$r$,399,38,40,8,3,$r$2$r$,$r$20 min$r$,$r$300g 5% beef mince
200g broccoli
30g soy sauce
220g cooked rice
10g garlic & ginger$r$,$r$1. Brown the beef in a hot wok, breaking it up.
2. Add garlic, ginger and broccoli, stir-fry 4-5 min.
3. Splash in the soy, toss, serve over the rice.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-11-beef-broccoli-stir-fry.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Prawn & Veg Noodles$r$,381,43,41,5,5,$r$2$r$,$r$20 min$r$,$r$300g cooked prawns
250g cooked noodles
200g mixed stir-fry veg
30g soy sauce
20g sriracha$r$,$r$1. Stir-fry the veg in a hot wok with spray oil for 4-5 min.
2. Add the prawns and noodles, then the soy and sriracha.
3. Toss until hot through and serve.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-12-prawn-veg-noodles.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Tuna Pasta Bake$r$,391,40,46,5,4,$r$3$r$,$r$30 min$r$,$r$3 tins tuna (300g drained)
330g cooked pasta
400g chopped tomatoes
1 onion
60g grated low-fat cheese$r$,$r$1. Soften the onion, add the chopped tomatoes, simmer 10 min.
2. Stir in the tuna and cooked pasta, tip into a dish.
3. Top with the cheese and grill/bake until golden.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-13-tuna-pasta-bake.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Air-Fryer Cod & Chips$r$,311,33,35,4,6,$r$2$r$,$r$30 min$r$,$r$2 cod fillets (300g)
350g potatoes, cut into chips
150g garden peas
5g olive oil
Lemon, salt, pepper$r$,$r$1. Toss the chips in the oil and air-fry at 200C for 18-22 min.
2. Season the cod and air-fry 10-12 min until flaky.
3. Serve with the peas and a squeeze of lemon.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-14-air-fryer-cod-chips.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Turkey Chilli$r$,443,42,49,8,8,$r$3$r$,$r$30 min$r$,$r$450g lean turkey mince
400g chopped tomatoes
240g chickpeas/kidney beans
1 onion & peppers
240g cooked rice$r$,$r$1. Brown the turkey, add the onion and peppers.
2. Add the tomatoes, beans and chilli spices, simmer 15-20 min.
3. Serve over the rice.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-15-turkey-chilli.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Chicken Caesar-Style Salad$r$,308,45,19,5,3,$r$2$r$,$r$15 min$r$,$r$300g chicken breast
200g lettuce & cucumber
60g light caesar/yoghurt dressing
2 slices wholemeal, croutons
20g grated low-fat cheese$r$,$r$1. Season and grill the chicken, then slice.
2. Toast the bread and cube for croutons.
3. Toss the leaves with the dressing, top with chicken, croutons and cheese.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-16-chicken-caesar-style-salad.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Tofu & Veg Stir Fry (V)$r$,392,27,45,11,5,$r$2$r$,$r$20 min$r$,$r$300g firm tofu
250g mixed stir-fry veg
30g soy sauce
220g cooked rice
10g garlic & ginger$r$,$r$1. Press and cube the tofu, crisp it in a hot pan with spray oil.
2. Add garlic, ginger and veg, stir-fry 5 min.
3. Add the soy, toss, serve over rice.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-17-tofu-veg-stir-fry-v.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Red Lentil Dahl (V)$r$,478,26,81,6,21,$r$3$r$,$r$30 min$r$,$r$300g red lentils (cooked wt 690g)
200g light coconut milk
400g chopped tomatoes
1 onion, garlic, ginger
240g cooked rice$r$,$r$1. Soften the onion, garlic and ginger with curry spices.
2. Add the lentils, tomatoes and coconut milk, simmer 15-20 min.
3. Serve with the rice.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-18-red-lentil-dahl-v.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Chicken & Halloumi Skewers$r$,517,51,44,15,3,$r$2$r$,$r$25 min$r$,$r$280g chicken breast
120g lighter halloumi
200g peppers & onion
260g cooked rice
20g tzatziki$r$,$r$1. Thread chicken, halloumi and veg onto skewers, season.
2. Grill or air-fry, turning, for 15-18 min.
3. Serve over rice with the tzatziki.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-19-chicken-halloumi-skewers.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Snack$r$,200,$r$High-Protein Yoghurt & Berries$r$,138,18,17,0,2,$r$1$r$,$r$2 min$r$,$r$170g 0% Greek yoghurt
60g mixed berries
5g honey$r$,$r$1. Spoon the yoghurt into a pot.
2. Top with berries and a drizzle of honey.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-20-high-protein-yoghurt-berries.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Snack$r$,300,$r$Tuna Rice Cakes$r$,260,28,24,6,1,$r$1$r$,$r$5 min$r$,$r$1 tin tuna (100g drained)
3 rice cakes
15g light mayo
Cucumber, black pepper$r$,$r$1. Mix the tuna with the mayo and pepper.
2. Spoon onto the rice cakes, top with cucumber.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-21-tuna-rice-cakes.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Snack$r$,200,$r$Cottage Cheese & Pineapple$r$,184,24,16,3,1,$r$1$r$,$r$2 min$r$,$r$200g low-fat cottage cheese
80g pineapple$r$,$r$1. Spoon the cottage cheese into a bowl.
2. Top with the pineapple.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-22-cottage-cheese-pineapple.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Snack$r$,300,$r$Boiled Eggs & Apple$r$,222,13,22,10,4,$r$1$r$,$r$12 min$r$,$r$2 eggs
1 apple$r$,$r$1. Boil the eggs 7-8 min, cool and peel.
2. Serve with the apple. Season the eggs to taste.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-23-boiled-eggs-apple.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Snack$r$,200,$r$Edamame Pot$r$,182,18,14,8,8,$r$1$r$,$r$5 min$r$,$r$150g cooked edamame
Sea salt, chilli flakes$r$,$r$1. Steam or microwave the edamame until hot.
2. Toss with sea salt and chilli flakes.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-24-edamame-pot.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Snack$r$,200,$r$Peanut Protein Energy Balls$r$,179,12,18,8,2,$r$6$r$,$r$15 min$r$,$r$80g oats
60g peanut butter
2 scoops (60g) vanilla whey
30g honey
20g dark chocolate chips$r$,$r$1. Mix everything in a bowl, adding a splash of water until it binds.
2. Roll into 6 balls.
3. Chill for 30 min. Keeps in the fridge for a week.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-hp-25-peanut-protein-energy-balls.jpg$r$,$r$shared$r$);
