-- ETL Recipes Book 1 — extracted from ETL_Recipes_1.pdf (macros as printed).
-- Upload final/recipe-images/*.jpg to the recipe-images bucket, then run this.
-- Re-runnable: clears this batch by image tag first.
delete from public.recipes where image_url like '%etl-book1-%' or name in ($r$Protein Pancakes$r$,$r$Sweet Potato Pancakes$r$,$r$Protein Yoghurt and pancakes$r$,$r$Choc brownie overnight oats$r$,$r$The All Day Breakfast$r$,$r$Salmon & Poached egg$r$,$r$Ham & Cheese Omelette$r$,$r$Granola and natural yoghurt$r$,$r$Egg Bake$r$,$r$Bacon & Egg Bagel$r$,$r$Sweet potato hash browns$r$,$r$Protein Carrot Cake Overnight Oats$r$,$r$Chorizo burger$r$,$r$Chicken and Roasted veg$r$,$r$Honey Mustard Chicken$r$,$r$Lebanese Beef Kofte$r$,$r$Tuna Mayo wrap$r$,$r$Chicken Fajitas$r$,$r$Cheese stuffed BBQ burger$r$,$r$Low fat Chicken tikka masala$r$,$r$Salsa Chicken$r$,$r$Easy Shepherds pie$r$,$r$Crispy Shredded Beef$r$,$r$Shepherds pie$r$,$r$Lean Lasagne$r$,$r$Nandos chicken, sweet potato wedges and kale$r$,$r$Tuna steak & seared asparagus$r$,$r$Satay Chicken$r$,$r$Healthy Hunters Chicken$r$,$r$BBQ Beef Brisket$r$,$r$ETL BBQ Sauce$r$,$r$Chilli nachos$r$,$r$Cheese and black pudding stuffed pork fillet$r$,$r$Low Calorie Chicken pie$r$,$r$Sticky Lemongrass chicken burgers$r$,$r$Vegetarian easy shepherds pie$r$,$r$Braised Winter cabbage$r$,$r$Crispy Chilli halloumi$r$,$r$Protein Mug cake$r$,$r$Raspberry- Almond protein smoothie$r$);

insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,100,$r$Protein Pancakes$r$,59,8.0,5.1,0.8,2.0,6,$r$per pancake$r$,$r$2 scoops vanilla protein powder
4 x egg whites
1/2 cup porridge oats
splash of water$r$,$r$1. Warm a pan with a few sprays of fry light (medium heat)
2. Blend the ingredients together
3. Cook as either 6 small pancakes or 3 fllarge until they have a uffy texture$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-01-protein-pancakes.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,200,$r$Sweet Potato Pancakes$r$,122,9.3,15.5,2.2,7.0,6,$r$per pancake$r$,$r$1 scoop vanilla protein powder
170g sweet potato
4 x egg whites
1/2 cup porridge oats
1 whole egg
1/2 tsp. vanilla extract
1/2 tsp. cinnamon
50g 0% fat free greek yoghurt
4 sprays fry light$r$,$r$1. Peel and boil the sweet potato until soft
2. Warm a pan with a few sprays of fry light (medium heat)
3. Add all Ingredients including cooked sweet potato into blender
4. Blitz until a smooth thick liquid
5. Cook as either 6 small pancakes or 3 fllarge do so until they have a uffy texture$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-02-sweet-potato-pancakes.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,400,$r$Protein Yoghurt and pancakes$r$,336,24.0,57.0,4.0,5.0,1,$r$$r$,$r$1 x tub Arla protein yoghurt
2 x scotch pancakes
50g blueberries
50g raspberries$r$,$r$1. Toast the Scotch pancakes for a couple of minutes
2. Top with the Arla yoghurt, Blueberries and raspberries$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-03-protein-yoghurt-and-pancakes.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,400,$r$Choc brownie overnight oats$r$,336,17.0,35.0,10.0,8.0,2,NULL,$r$1 cup unsweetened almond milk
1/2 cup 0% fat greek yoghurt
2 tbsp unsweetened cocoa powder
pinch salt
2 tbsp baking stevia
1 cup porridge oats
1 scoop PHD diet whey (chocolate)$r$,$r$1. Add all ingredients together in a blender, blitz until thick
2. Serve as 2 portions in a bowl or mug
3. Once cooled to room temperature leave in fridge over night$r$,NULL,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,600,$r$The All Day Breakfast$r$,520,51.0,31.0,19.0,5.0,1,$r$$r$,$r$2 x bacon medallions
1 x egg
3 x smoked paprika Heck chicken sausages
1x slice Warburtons seeded batch
1/4 tin baked beans
10g flora light
4 sprays fry light$r$,$r$1. Put the sausages under the grill on full, turn as they brown, add medallions after first turn.
2. As the sausage and bacon are nearly done Fry egg in pan with fry light and add beans to a pan on low heat
3. Add bread to toaster
4. Everything should finish around the same time, serve however you like$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-05-the-all-day-breakfast.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,400,$r$Salmon & Poached egg$r$,314,42.0,2.0,15.0,0.0,1,$r$$r$,$r$140g Salmon Fillet
1 poached egg
1/2 cup spinach
Chopped spring onion$r$,$r$1. Warm a pan with a few sprays of fry light (medium heat)
2. Add The salmon cook for 4 minutes a side bring water to the boil in a pan.
3. Place a layer of cling film in a cup, brush it with oil and drop a fresh egg into it. Twist the ends of the cling film together and knot them to form a little sack.
4. Turn down the heat – the water should only simmer.
5. Place the egg in its sack gently into the water and let it cook for 4 minutes in hot water with spinach$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-06-salmon-poached-egg.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,400,$r$Ham & Cheese Omelette$r$,314,42.0,2.0,15.0,0.0,1,$r$$r$,$r$1 x Whole egg
2 x Egg whites
5 slices Honey roast wafer thin ham
30g Nume Mature cheese
x sprays fry light$r$,$r$1. Warm a pan with a few sprays of fry light (medium heat)
2. Whisk up the eggs and either add the ham and cheese or fry them for 60sec first then add eggs
3. Once beginning to cook, fold in half, cook for 60 sec
4. Flip and repeat$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-07-ham-cheese-omelette.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,400,$r$Granola and natural yoghurt$r$,339,17.0,46.0,10.0,6.0,1,$r$$r$,$r$45g Jordan's super nutty granola
150g 0% fat free greek yoghurt
50g Raspberries
10g Honey$r$,$r$1. Place the yoghurt in a bowl
2. Top with the raspberries, granola and honey$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-08-granola-and-natural-yoghurt.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,400,$r$Egg Bake$r$,331,25.7,3.7,21.7,0.5,4,$r$$r$,$r$4 x whole eggs
8 x egg whites
1 1/2 cups kale
2 tsp. coconut oil
75g diced chorizo
100g goats cheese$r$,$r$1. Preheat oven to 190c
2. Fry the chorizo and kale with coconut oil until crispy
3. Whisk up the eggs and egg whites and add to an oven dish with the Chorizo and kale.
4. Top with Goats cheese
5. Cook for about half an hour, check regularly and press down to make sure all egg is cooked$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-09-egg-bake.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,500,$r$Bacon & Egg Bagel$r$,457,30.0,43.0,18.0,4.0,1,$r$$r$,$r$2 x bacon medallions
1 x egg
1 x New York bakery red onion bagel
20g clover light
4 sprays fry light$r$,$r$1. Place the medallions in a medium hot pan with the fry light
2. Cook for about 3 minutes each side
3. Once flipped add the egg
4. Put Bagel in the toaster
5. Serve medallions and egg on buttered bagel$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-10-bacon-egg-bagel.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,100,$r$Sweet potato hash browns$r$,47,1.0,8.0,1.0,1.0,12,$r$per hash brown$r$,$r$340g sweet potato
1/2 onion chopped
4 garlic cloves crushed
30g plain
1 tsp. sea salt
1/2tsp black pepper
1 tbsp coconut oil$r$,$r$1. Grate the sweet potato into thin small pieces then add all other ingredients whilst ha;f the coconut oil heats in a pan.
2. Form the ingredients into small circles (around 12 of them)
3. Cook a few at a time in the pan (depending on how big your pan is) and add rest of coconut oil as needed
4. They are cooked once crisp on the outside$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-11-sweet-potato-hash-browns.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,400,$r$Protein Carrot Cake Overnight Oats$r$,377,17.4,50.9,6.6,9.1,2,$r$$r$,$r$360ml almond milk
100g porridge oats
1 scoop PHD diet whey (Vanilla)
60g grated carrot
30g raisins
1 tsp. mixed spice
1 tsp. cinnamon
1 egg white$r$,$r$1. Simmer almond milk and carrot in pan for 5 mins
2. Add spices, egg white and oats, stir well and cook for 2 mins
3. Stir in Protein and raisins and leave to cool
4. Once cooled to room temperature leave in fridge over night$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-12-protein-carrot-cake-overnight-oats.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,200,$r$Chorizo burger$r$,189,27.0,6.6,6.0,1.0,8,$r$$r$,$r$750g 5% lean mince
100g light Sweet chilli sauce (blue dragon)
70g Diced Chorizo
1 small diced red onion
1 tbsp tomato puree
1 tbsp smoked paprika
1 tsp Worcestershire sauce$r$,$r$1. Warm a pan with a few sprays of fry light (medium heat)
2. Add all the ingredients together
3. Form into 8 Burgers
4. Add to the pan, cook for about 4-5 minutes each side (Can be done in the oven at 190c for about 20 minutes or in an actifry for about 15 minutes)$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-13-chorizo-burger.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,300,$r$Chicken and Roasted veg$r$,269,38.0,11.0,8.0,4.0,4,$r$$r$,$r$600g Chicken breast (about 4 breasts)
160g mange-tout
140g baby-corn
200g broccoli
1 tbsp coconut oil
1 tbsp honey
1 tbsp rosemary
1 tbsp thyme$r$,$r$1. Chop up veg and add to an oven dish with rosemary, thyme, coconut oil and honey for about 40 minutes (We recommend making 4 servings of this for other meals)
2. Add a spice of your choice to chicken and cook in the oven for 20-25 minutes$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-14-chicken-and-roasted-veg.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,200,$r$Honey Mustard Chicken$r$,199,34.0,8.0,2.0,0.0,4,$r$$r$,$r$600g Chicken breast
15g Mustard
40g honey
2 tsp. red wine vinegar
1 tsp. Worcestershire sauce
1 clove crushed garlic
black pepper
5 x sprays fry light$r$,$r$1. Add the mustard, honey, Red wine vinegar, garlic and black pepper to a bowl, mix them together
2. Butterfly the chicken breasts (Slice down the middle but not all the way through)
3. Cover in marinade, cover over in cling film and leave in fridge for a few hours if possible)
4. Heat the fry light in a pan, add the chicken, cook for about 5-6 minutes each side, ensure cooked right through$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-15-honey-mustard-chicken.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,200,$r$Lebanese Beef Kofte$r$,123,18.0,3.0,5.0,0.7,8,$r$per kofte$r$,$r$750g 5% lean mince
1
2 tsp. black pepper
2 tsp. Cinnamon
2 tsp. Cayenne pepper
2 tsp. Himalayan pink salt
5 tsp. cumin
4 x sprays fry light$r$,$r$1. Mix the Pepper, cinnamon, cayenne pepper, pink salt and cumin in a small bowl
2. In large mixing bowl add mince, chopped onion and the spices from smaller bowl
3. Shape into 8 sausage shapes onto skewers
4. Cook in a griddle pan or under the grill, brown all edged cooking through, about 3-4 minutes per side$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-16-lebanese-beef-kofte.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Tuna Mayo wrap$r$,351,36.0,32.0,7.0,6.0,1,$r$$r$,$r$1 x John West tin of tuna
2 tbsp lighter than light mayo
1 tbsp sweetcorn
1 x mission deli wholemeal wrap$r$,$r$1. Mix the tuna, mayo and sweetcorn in a dish
2. Warm wrap in microwave for 30 seconds
3. Add ingredients to wrap$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-17-tuna-mayo-wrap.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Chicken Fajitas$r$,376,38.0,32.0,9.0,5.0,4,$r$per wrap$r$,$r$600g Chicken breast
1 red pepper
1 onion diced
1 x old el paso fajita mix
4 x wholemeal mission wraps
4 x sprays fry light$r$,$r$1. Fry diced chicken and onion in a pan until browned
2. Once brown add pepper, fajita spice mix and a splash of water
3. Simmer until liquid reduces
4. Microwave wraps for 30 sec and add chicken mix$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-18-chicken-fajitas.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,200,$r$Cheese stuffed BBQ burger$r$,199,27.0,8.0,6.0,1.0,4,$r$$r$,$r$500g 5% lean mince
6 tbsp ETL BBQ sauce (see recipe)
2 Laughing cow cheese triangles
1 tsp. salt
x sprays fry light$r$,$r$1. Warm a pan with a few sprays of fry light (medium heat)
2. Add all the ingredients together except for cheese
3. Form into 8 Burgers around half a cheese triangle
4. Add to the pan, cook for about 4-5 minutes each side$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-19-cheese-stuffed-bbq-burger.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,300,$r$Low fat Chicken tikka masala$r$,274,43.0,17.0,2.5,1.1,5,$r$$r$,$r$800g chicken breast
400g 0% greek yoghurt
2 1/2 tbsp tikka curry powder
4 crushed garlic cloves
3 tbsp tomato puree
200ml vegetable stock
1 onion
1 squeezed lemon
1 handful fresh coriander$r$,$r$1. Mix 300g of 0% fat Greek yoghurt with 2- 3tbsp tikka powder, the crushed garlic and lemon juice, add the diced chicken and leave in fridge for 30 mins
2. Cook in the oven at 190c for 18 minutes or actifry for 15 minutes
3. Fry up the onion, add tomato purée, 1 tbsp tikka powder and 200ml vegetable stock, once cooked add the rest of the Greek yoghurt
4. Add the chicken, mix together then serve with a little coriander$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-20-low-fat-chicken-tikka-masala.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,300,$r$Salsa Chicken$r$,238,30.0,16.1,4.4,3.9,5,$r$$r$,$r$600g Chicken breast
1 Old el Paso Fajita mix
400g Butter beans
1 tin Sweetcorn
1 tsp. Worcestershire sauce
2 tbsp smoked paprika
400g passatta/chopped tomatoes$r$,$r$1. Add all the ingredients to slow cooker, keep chicken breasts whole
2. Cook on low for 6-8 hours
3. Shred the chicken breast and serve$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-21-salsa-chicken.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Easy Shepherds pie$r$,340,27.9,30.0,10.0,8.0,4,$r$$r$,$r$500g 5% lean mince
2 packs (800g) root veg mash(or low kcal mash)
1 onion
2 carrots
1 pack of Colman's shepherds pie mix
1/2 cup frozen peas
5 x sprays fry light$r$,$r$1. Fry the onion and mince in a pan with fry light until browned, drain off the excess liquid
2. Add frozen peas, carrots and the Colman's shepherds pie mix made as it says on packet
3. Cook for 5 minutes until liquid thickens
4. Microwave Root veg or low calorie mash until soft
5. Transfer mince into an oven dish and top with mash
6. Place in the oven for 20 minutes at 190c$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-22-easy-shepherds-pie.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Crispy Shredded Beef$r$,350,23.7,36.5,13.0,3.3,2,$r$$r$,$r$200g Rump steak (fat cut off)
2 tbsp corn flour
2 tbsp Chinese 5 Spice
1 tbsp olive oil
1 red pepper diced
1 red chilli diced
2 spring onions
1 Garlic clove
Small piece of fresh ginger
1 tbsp Rice wine Vinegar
1 tbsp Ketchup
1/2 tbsp light soy sauce$r$,$r$1. Mix the steak strips with cornflour and 5 spice and leave for 10 mins
2. Add rice wine vinegar, ketchup, soy sauce and tbsp water to a jar and mix for sauce.
3. Heat the oil then add the steak strips, cook for 1-2 mins until browned and remove
4. Add all the veg into pan and stir fry for 3 mins
5. Turn heat down and add the sauce for 1 minute then add the beef to cover$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-23-crispy-shredded-beef.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Shepherds pie$r$,370,29.4,40.0,10.0,6.0,6,$r$$r$,$r$750g 5% lean mince
1000g potato
2 onions
2 carrots
3 garlic cloves
1 tbsp rosemary
1 tbsp thyme
2 tbsp tomato puree
1 tbsp smoked paprika
50g clover light
1 tbsp himalayan pink salt
200ml semi skimmed milk$r$,$r$1. Peel, chop and boil potatoes until soft
2. Fry the mince and onion in fry light until browned
3. Add garlic cloves, rosemary, thyme, tomato puree and paprika cook for a further few minutes
4. Mash the potatoes with the milk, clover light and salt
5. Add carrots to the mince, then transfer into an oven dish
6. top with mash and cook in the oven for 25 minutes on 190c$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-24-shepherds-pie.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Lean Lasagne$r$,352,39.0,35.0,9.0,4.6,4,$r$$r$,$r$500g 5% lean mince
1 red onion
400g chopped tomatoes
2 cloves of garlic-crushed
2 tbsp tomato puree
80g of lasagne sheets
4 tbsp Bisto cheese sauce
50g low fat grated cheese
2 grated carrots
1 tbsp Mixed herbs
100g passatta$r$,$r$1. Fry mince, onions and garlic until browned, drain off excess liquid
2. Add 2 tbsp tomato puree, the chopped tomatoes, mixed herbs and the grated carrot and cook for 5 more minutes
3. Layer the mince and the lasagne sheets in an oven dish and top with the Bisto cheese sauce
4. Cook in the oven for about 35-40 minutes on 180c checking it doesn’t burn too much on the top$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-25-lean-lasagne.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Nandos chicken, sweet potato wedges and kale$r$,489,39.0,57.0,13.0,8.0,1,$r$$r$,$r$150g Chicken breast (about 1 breast)
2 tbsp nandos marinade
200g sweet potato chopped into wedges
1 cup of Kale
1/2 tbsp Coconut oil
5 sprays fry light
1 tsp. rosemary
1 tsp. thyme$r$,$r$1. Marinade chicken in the nandos sauce (Bulk marinade do more than one at once) Leave for a few hours
2. Chop sweet potatoes into wedges, spread evenly on a tray, spray with fry light and add rosemary, thyme and honey, cook at 190c until browned and soft (about 30 minutes)
3. Cook chicken in the oven for 20-25 mins in the oven or fry in the pan for 15 minutes until cooked through
4. Fry kale with coconut oil until crisp$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-26-nandos-chicken-sweet-potato-wedges-and-kale.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,300,$r$Tuna steak & seared asparagus$r$,207,39.0,5.0,5.0,3.0,1,$r$$r$,$r$150g Tuna steak
Squeeze of lemon juice
2 tsp. black pepper
1/2 cup asparagus
1 tsp. olive oil
4 x sprays fry light
2 tsp. Himalayan pink salt$r$,$r$1. Warm fry light in a griddle pan, squeeze lemon juice on tuna steak
2. Cook in pan until steak goes white to about half way down then flip and repeat
3. During this time add asparagus to hot pan with pink salt and fry light spray
4. Once browned add asparagus to cooked tuna steak and enjoy$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-27-tuna-steak-seared-asparagus.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Satay Chicken$r$,435,44.0,10.0,23.0,3.3,4,$r$per skewer$r$,$r$600g diced Chicken breast (about 4 breasts)
150g smooth peanut butter
10ml dark soy sauce
15g Honey
1 tsp. fish sauce
1 tsp. chilli flakes
150ml light coconut milk
4 x sprays fry light$r$,$r$1. Mix the Peanut butter, soy sauce, honey, fish sauce, chilli flakes and coconut milk together, set aside about 1/4 of the mixture
2. Dice chicken and coat in the larger of the 2 portions of the other
3. Add chicken to 4 skewers
4. Cook in a pan on all angles until cooked through (around 3-4 minutes per side)
5. Serve with the rest of the mixture as a dip$r$,NULL,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Healthy Hunters Chicken$r$,314,48.0,13.0,8.0,0.0,4,$r$$r$,$r$600g chicken breast (whole)
8 bacon medallions
4 Laughing cow blue cheese triangles
1/2 ETL BBQ Sauce recipe (roughly 10 tbsp)$r$,$r$1. Make up the ETL BBQ sauce as found in this recipe book
2. Butterfly the chicken breast and stuff with blue cheese triangle
3. Close the breast up and wrap in 2 bacon medallions
4. Cover all in sauce and leave to marinade
5. Cook in oven at 190c for 20-25c$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-29-healthy-hunters-chicken.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$BBQ Beef Brisket$r$,532,60.0,20.0,21.0,0.0,5,$r$$r$,$r$1kg beef brisket
1 tsp. mild chill pepper
1 tsp. salt
1 tsp. pepper
1 tsp. smoked paprika
ETL BBQ sauce$r$,$r$1. Mix the chilli pepper, salt, pepper and smoked paprika in a small bowl
2. Place brisket into slow cooker and cover with the mixture from small bowl
3. Make ETL BBQ sauce and add 3/4 of it to slow cooker
4. Cook on low for any where between 6 and 12 hours, the longer its in the more tender it gets$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-30-bbq-beef-brisket.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Side$r$,100,$r$ETL BBQ Sauce$r$,17,0.2,3.4,0.1,0.1,34,$r$per tbsp$r$,$r$400g Passatta
2 tbsp cider vinegar
2 tbsp Worcestershire sauce
3 tsp. smoked paprika
1/2 tsp. ground mustard seed
1/2 cup stevia/sweetener
170ml sweet chilli sauce$r$,$r$1. As simple as to mix all the you have it.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-31-etl-bbq-sauce.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Chilli nachos$r$,393,30.6,35.8,12.0,7.1,5,$r$$r$,$r$500g 5% lean mince
1 onion
400g chopped tomatoes
400g kidney beans
50g low fat grated cheese
3 x tortilla wraps
Small pot reduced fat sour cream
Small pot low calorie salsa$r$,$r$1. Fry mince & onions, in fry light, whilst cooking put oven on 200 c, chop the wraps into triangles (8 per wrap) and place in the oven until crisp
2. Add old el paso mix to mince once browned, add the chopped tomatoes and simmer for 10 mins (add kidney beans for last minutes
3. Take out the tortillas, place chilli in a bowl and top with sour cream, cheese and salsa$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-32-chilli-nachos.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Cheese and black pudding stuffed pork fillet$r$,368,56.0,10.0,12.6,0.0,3,$r$$r$,$r$500g pork tenderloin
3 laughing cow blue cheese triangles
1 slice of black pudding chopped up
5 bacon medallions
150ml of bisto cheese sauce (made up)
6 x sprays fry light$r$,$r$1. Slice the pork tenderloin most the way through, spread the cheese triangles and and the black pudding slices inside.
2. Wrap in the bacon medallions, place on a baking tray and cover with tin foil.
3. Cook on 180c for 35-40 mins
4. Make up the cheese sauce and add on top once serving$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-33-cheese-and-black-pudding-stuffed-pork-fillet.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Low Calorie Chicken pie$r$,424,48.8,29.3,10.9,1.1,4,$r$$r$,$r$800g Diced chicken breast
100ml light single cream
1 leek chopped
4 sheets Filo pastry
150ml of bisto cheese sauce (made up 2tbsp)
2 chicken stock cubes in 400ml boiling water
Handful spinach
4 sprays fry light$r$,$r$1. Fry the chicken on medium heat with fry light- preheat oven to 190c
2. Once nearly cooked add the cream, leek, cheese sauce, chicken stock and spinach, leave to simmer
3. Add ingredients to oven proof dish and cover with broken up filo pastry
4. Cook in oven for 20-25 minutes or until pastry is crispy$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-34-low-calorie-chicken-pie.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,200,$r$Sticky Lemongrass chicken burgers$r$,134,23.0,1.7,3.5,0.2,7,$r$per burger$r$,$r$400g chicken breast
200g boneless, skinless chicken thighs
1 tbsp rice vinegar
1 tbsp soy sauce
1 tbsp fish sauce
3 spring onions diced
2 tbsp lemongrass puree
1 inch ginger grated and peeled
2 garlic cloves crushed
3 tbsp chopped coriander
2 tbsp stevia
4 sprays fry light$r$,$r$1. Blend the chicken, onion, lemongrass, ginger, garlic and coriander, form into 7 burgers
2. Cook burgers on medium heat, once nearly cooked (about 4 mins each side) pour over rice vinegar, soy sauce, sauce and stevia,
3. Cook for a further few minutes and serve$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-35-sticky-lemongrass-chicken-burgers.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Vegetarian easy shepherds pie$r$,327,23.0,35.2,7.4,14.9,4,$r$$r$,$r$500g quorn mince
2 packs (800g) Root veg mash (or low kcal mash)
1 onion (diced)
2 carrots (chopped)
1 pack of Colmans shepherds pie mix
1/2 cup frozen peas
5 x sprays fry light$r$,$r$1. Fry the onion and mince in a pan with fry light until browned, drain off excess liquid
2. Add frozen peas, carrots and Colman's shepherds pie mix made up as it says on the packet with water.
3. Cook for 5 mins until liquid thickens.
4. Microwave Root mash until soft
5. Transfer mix onto oven dish and top with mash
6. Place in the oven for 20 mins at 190c$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-36-vegetarian-easy-shepherds-pie.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Side$r$,100,$r$Braised Winter cabbage$r$,97,3.0,16.4,0.8,4.8,3,$r$$r$,$r$1 head of cabbage
1/2 onion
3 carrots
1 cup vegetable stock
3 garlic cloves
1 tbsp chopped rosemary
salt and pepper$r$,$r$1. Heat Oven to 170c, chop cabbage into half then into 2 inch wedges, roughly chop onion and carrot.
2. Spread the cabbage over a baking tray then lay onion and carrot around them, pour over broth and oil, cover with foil and cook for 40 minutes
3. Whilst cooking slice potatoes in half, once 40 minutes is up add potatoes, garlic, rosemary and1/2 tsp salt, cook for further 40 minutes (last 10 mins take foil off.
4. 1 serving as a side or 2 as a meal$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-37-braised-winter-cabbage.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Crispy Chilli halloumi$r$,304,18.0,25.4,15.4,15.4,3,$r$$r$,$r$200g Low fat Halloumi
2 tbsp corn flour
2 tbsp Chinese 5 Spice
1 tbsp olive oil
1 red pepper diced
1 red chilli diced
2 spring onions
1 Garlic clove
Small piece of fresh ginger
1 tbsp Rice wine Vinegar
1 tbsp Ketchup
1/2 tbsp light soy sauce$r$,$r$1. Mix the halloumi strips with cornflour and 5 spice and leave for 10 mins
2. Add rice wine vinegar, ketchup, soy sauce and tbsp water to a jar and mix for sauce.
3. Heat the oil then add the halloumi strips, cook for 1-2 mins until browned and remove
4. Add all the veg into pan and stir fry for 3 mins
5. Turn heat down and add the sauce for 1 minute then add the halloumi to cover$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-38-crispy-chilli-halloumi.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Dessert$r$,200,$r$Protein Mug cake$r$,150,20.3,9.9,1.9,5.9,1,$r$$r$,$r$1 scoop protein works mug cake mix
3/4 scoop water or milk (add calories for milk$r$,$r$1. Add a scoop to your cup
2. Add 3/4 scoop water or milk (if you use milk remember to add it to your calories
3. Microwave for 30 seconds and done, you have a high protein cake$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-39-protein-mug-cake.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Snack$r$,300,$r$Raspberry- Almond protein smoothie$r$,224,20.8,15.6,6.9,10.4,1,$r$per smoothie$r$,$r$240ml almond milk unsweetened
1 tbsp chia seed
40 gram frozen raspberries
1/2 tsp vanilla extract
1/2 tsp almond extract
2 tbsp stevia
1 scoop vanilla PHD diet whey/sun warrior protein$r$,$r$1. Blend all ingredients together and serve$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book1-40-raspberry-almond-protein-smoothie.jpg$r$,$r$shared$r$);
