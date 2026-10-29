-- Stealth Health Meal Prep (Book 3) — recipes extracted from PDF (Tom Walsh).
-- Upload final/recipe-images/*.jpg to the recipe-images bucket, then run this.
delete from public.recipes where image_url like '%etl-book3-%' or name in ($r$Chicken Fried Rice$r$,$r$Garlic Parmesan Chicken Alfredo$r$,$r$Cajun Chicken Mac n Cheese$r$,$r$Orzo Burrito Bowls$r$,$r$Lemon Parmesan Chicken & Rice$r$,$r$Orange Chicken$r$,$r$Spicy Peanut Sauce Noodles$r$,$r$Chipotle Chicken & Bacon Alfredo$r$,$r$Queso Chicken & Rice$r$,$r$Loaded Cheddar Fries$r$,$r$Chicken Burrito Bowls$r$,$r$Taco Mac n Cheese$r$,$r$Honey Garlic Chicken & Rice$r$,$r$Korean Beef Rice Bowls$r$,$r$Green Chili Queso Mac n Cheese$r$,$r$Creamy Chicken Pesto Pasta$r$,$r$Pepperoni Pizza Bagel Bites$r$,$r$Honey Garlic Chili Crisp Noodles$r$,$r$Buffalo Chicken Mac n Cheese$r$,$r$Italian Meatball Pasta$r$,$r$Pepperoni Pizza Mac n Cheese$r$,$r$Butter Chicken Rice Bowls$r$,$r$Everything Bagel Chicken Alfredo$r$,$r$Pollo Asado Burrito Bowls$r$,$r$Chicken Bulgogi Rice Bowls$r$,$r$Halal Cart-style Chicken & Rice$r$,$r$Jalapeño Popper Mac n Cheese$r$,$r$White Cheddar Truffle Mac$r$,$r$Cajun Chicken Alfredo$r$,$r$Southwest Chicken & Veggie Orzo$r$,$r$Cheesy Butternut Orzo$r$,$r$Spicy Tomato Chicken Pasta$r$,$r$Breakfast Mac n Cheese$r$,$r$Chimichurri Pasta w/ BBQ Chicken$r$,$r$Spicy Sausage Pasta$r$,$r$Honey Habanero Chicken and Rice$r$,$r$Honey BBQ Chicken Mac n Cheese$r$,$r$Korean Beef & Cheesy Gochujang Pasta$r$,$r$Creamy Roasted Red Pepper Pasta$r$,$r$Creamy Southwestern Chicken & Rice$r$,$r$Spicy Taco Bowls$r$,$r$Creamy Chipotle Chicken Pasta$r$,$r$Creamy Fajita Chicken Orzo$r$,$r$The Original Beefy Cheesy Burrito$r$,$r$Cajun Chicken Mac n Cheese Burrito$r$,$r$Meat Lovers Breakfast Burrito$r$,$r$Butter Chicken Burrito$r$,$r$Creamy Chicken Fajita Burrito$r$,$r$Buffalo Chicken Burrito$r$,$r$Creamy Chicken & Rice Burritos$r$,$r$Green Chile Queso Burrito$r$,$r$Cheesy Egg Breakfast Burrito$r$,$r$Chicken Parm Burrito$r$,$r$Chicken Cali Burrito$r$,$r$Creamy Chicken & Cheese Burritos$r$,$r$Jalapeno Cheddar Chicken Burrito$r$,$r$Frittata Breakfast Burrito$r$,$r$Mini Creamy Beef & Cheese Burritos$r$,$r$Street Taco Chicken Breakfast Burrito$r$,$r$Street Taco Taquitos$r$,$r$Sausage Egg and Cheese Sandwiches$r$,$r$Ham Egg & Cheese Sandwiches$r$,$r$Meal Prep Frozen Cheeseburgers$r$,$r$Garlic Parmesan Chicken$r$,$r$Sweet & Spicy Korean Beef$r$,$r$Street Taco Chicken$r$,$r$Italian Meatballs (and Marinara)$r$,$r$Carne Asada$r$,$r$Chimichurri Chicken Bites$r$,$r$Chipotle-style Chicken$r$,$r$Chipotle-style Steak$r$,$r$Butter Chicken$r$,$r$Lemon Pepper Chicken$r$,$r$Cilantro Lime Chicken$r$,$r$Chicken Bulgogi$r$,$r$Chipotle Chicken Meatballs$r$,$r$Grilled Buffalo Chicken Strips$r$,$r$Italian Style Chicken Nuggets$r$,$r$Honey Garlic Chicken$r$,$r$Halal Cart-style Chicken$r$,$r$Counter - Taco Mac$r$,$r$Counter - Beefy Queso Burritos$r$,$r$Counter - Chicken Queso Burritos$r$,$r$Counter - Breakfast Burritos$r$,$r$Counter - Breakfast Bowls$r$);

insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Chicken Fried Rice$r$,500,41,47,17,0,5,$r$$r$,$r$709g chicken breast, thin sliced and diced
1 tablespoon garlic powder
2 tablespoons soy sauce
1 tablespoon avocado oil (or any neutral oil)
1 tablespoon sriracha
300g mixed frozen veggies of choice (I used carrots, peas, mushrooms and onions)
200g egg whites
3 eggs
700g day-old cooked rice (300g dry weight)
3 tablespoons soy sauce
3 tablespoons sesame oil$r$,$r$1. Slice the chicken breast thin and dice the chicken into cubes, and then marinate in a bowl with garlic powder, soy sauce, avocado oil, and sriracha
2. Whisk together egg whites and 3 eggs in a bowl until they are fully combined
3. Cook the chicken in a pan on high heat in two/three batches for about 2-3 minutes until fully cooked through
4. Once chicken is cooked through, remove the chicken and place mixed veggies in the pan until fully softened. When the veggies are done, push them to the side of the pan and pour in the egg mixture
5. Cook the eggs until they are scrambled, then mix all of the ingredients together, pour over the rice, top off with soy sauce and sesame oil, and mix. Mix in cooked chicken, and enjoy$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-01-chicken-fried-rice.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Garlic Parmesan Chicken Alfredo$r$,505,44,52,15,0,5,$r$$r$,$r$454g skinless chicken thighs
10g olive oil (2 tspns)
2 tblspn white wine vinegar
1 tsp garlic powder
0.5 tsp dried oregano
0.25 tsp onion powder
0.25 tsp chili flakes
0.25 tsp salt
0.25 tsp pepper
10g Honey (2 tspns)
20g Parmigiano Reggiano ALFREDO SAUCE:
350g 2% cottage cheese
80g 1% milk
85g fresh Parmigiano Reggiano Pinch of salt, pepper and garlic powder
320g linguine (dry weight)$r$,$r$1. In a bowl, mix together the ingredients for the Garlic Parm chicken marinade. Add the chicken to the marinade. Let marinade up to overnight - if you're in a time crunch, at least 30 mins.
2. In a blender, combine low-fat cottage cheese, milk, freshly grated Parmigiano Reggiano cheese, salt, pepper, and garlic. Blend for 1-2 minutes until the sauce is completely smooth
3. Place the marinated chicken in an air fryer at 375 for 12-15 minutes or until the chicken is cooked through
4. Once the chicken is cooked, remove it from the air fryer and slice it into strips to prepare it for serving with the pasta
5. Cook the pasta according to the package instructions. Drain the pasta, reserving some pasta water. Toss the cooked pasta with the prepared cheese sauce, adding pasta water as needed to thin out the sauce. Finally, top the pasta with the sliced Garlic Parmesan chicken and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-02-garlic-parmesan-chicken-alfredo.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Cajun Chicken Mac n Cheese$r$,505,45,54,13,0,5,$r$$r$,$r$325g pasta
510g chicken breast Juice of 1 lemon
1 tablespoon olive oil
1 tablespoon Cajun seasoning
1 teaspoon coarse salt
1 teaspoon pepper
1 tspn garlic powder
300g 2% cottage cheese
60g mozzarella
60g cheddar cheese
25g Cheddar powder
3g Nutritional yeast
1 tablesooon Cajun seasoning
100g milk
1 tablespoon of Louisiana hot sauce$r$,$r$1. Marinate your chicken breast with lemon juice, olive oil, cajun seasoning, salt, pepper and garlic powder. Marinate for at least 30 minutes.
2. Cook chicken in a pan over medium high heat - flip every 1-2 mins until cooked through.
3. Place all cheese sauce ingredients in a blender and blend until completely smooth. Once chicken is done cooking, remove from pan, turn off the heat, and pour over your sauce (make sure the pan isn't too hot) to collect all the flavor left behind by the chicken.
4. Cook pasta according to the instructions on the box.
5. Mix your sauce with the pasta until completely coated.
6. Top with your sliced cajun chicken and garnish with chives & hot sauce$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-03-cajun-chicken-mac-n-cheese.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Orzo Burrito Bowls$r$,520,41,61,12,0,6,$r$$r$,$r$380g orzo
680g skinless chicken thighs Seasoned with: salt, garlic, onion, smoked paprika, chili powder
120g guacamole
250g greek yogurt Chipotle hot sauce Cilantro
1 lime$r$,$r$1. Preheat your air fryer to 375°F
2. Season boneless, skinless chicken thighs with each seasoning listed (even amounts of each seasoning, if you prefer to measure, mix each seasoning in a small bowl in bulk then use enough to completely cover each side of the chicken). Air fry the chicken thighs for 12-15 minutes
3. While the chicken cooks, cook your orzo according to packaging instructions
4. Once the chicken is cooked, let rest for 5 minutes, then dice into small pieces
5. In a large pan or bowl, mix together the cooked chicken, orzo, guacamole, greek yogurt, hot sauce, and the juice of one lime. Garnish with cilantro, and enjoy$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-04-orzo-burrito-bowls.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Lemon Parmesan Chicken & Rice$r$,495,40,52,15,0,5,$r$$r$,$r$680g chicken breast Juice of 1 lemon
1 tablespoon olive oil
1 tablespoon salt
0.5 tablespoon pepper
1 tspn garlic powder
320g basmati rice
30g butter
480g water Sauce:
180g fat free evaporated milk*
80g Parmigiano reggiano Juice of 0.5 lemon Pepper to taste (Reserve other half of lemon for deglazing pan after cooking chicken) *NOT CONDENSED MILK$r$,$r$1. Mix together lemon juice, olive oil, salt, pepper and garlic powder to make your lemon pepper marinade. Add in your chicken breast (flatten/tenderize first) and let marinate for 30 minutes
2. Rinse rice in a mesh strainer under cold water for 2 minutes, then combine with 480g of water and 30g of butter and bring to a boil. Once boiling, reduce heat to low, cover, and let cook for 15 minutes. Remove from heat, keep covered, and let sit another 10 minutes to cook rice.
3. Cook chicken in a pan over medium high heat - flip every 1-2 mins until cooked through
4. Place all sauce ingredients in a blender and blend until completely smooth. Once chicken is done cooking, remove from pan, turn heat to lowest setting, and juice half a lemon to deglaze. Pour over your sauce (make sure the pan isn't too hot) and simmer for a few minutes until slightly thickened
5. Separate your rice in to 5 equal servings, top with sliced chicken and pour over your sauce.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-05-lemon-parmesan-chicken-rice.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Orange Chicken$r$,510,40,58,13,0,5,$r$$r$,$r$907g skinless chicken thighs
5 tblspns corn starch
0.5 tspn onion powder
0.5 tspn garlic powder
0.5 tspn ginger powder
0.5 tspn salt
1 tspn black pepper
280g basmati rice (Uncooked weight) Sauce:
0.75 cup orange juice
2 tblspns avocado oil (or any neutral oil)
3 tblspns soy sauce
1.5 tblspns rice vinegar
2 tblspns zero calorie brown sugar ~0.5 tblspn grated ginger
3 cloves fresh minced garlic
0.25 tspn black pepper
1 tblspn sugar free orange marmalade
1.5 tblspn corn starch$r$,$r$1. Mix together corn starch, onion powder, garlic powder, ginger powder, salt, and black pepper and combine to create the coating for the chicken
2. Dice the chicken thighs into small 1 inch cubes and mix into the coating until all pieces are fully coated
3. Lightly spray with oil and air fry the coated chicken at 400 for 15 minutes until fully cooked
4. Rinse rice in a mesh strainer under cold water for 2 minutes, then combine with 420g of water and bring to a boil. Once boiling, reduce heat to low, cover, and let cook for 15 minutes. Remove from heat, keep covered, and let sit another 10 minutes to cook rice.
5. Place all sauce ingredients in a pan over medium heat until it begins to bubble, simmer until it is slightly thickened, but still is fluid enough to move around the pan
6. Mix the chicken into the pan, toss to coat, and serve over steamed rice or on its own and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-06-orange-chicken.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Spicy Peanut Sauce Noodles$r$,510,42,60,13,0,5,$r$$r$,$r$567g chicken breast
35g soy sauce
25g sriracha
10g lime juice
0.25 Tspn of each: Garlic powder, onion powder, red chili flakes
10 cloves minced garlic
5 green onions (separate "whites" and "greens" of the onion) Sauce:
100g creamy peanut butter
40g soy sauce
20g sriracha
75g honey
40g chopped sundried tomatoes
2-3 tablespoons of lime juice
300g noodles of choice (I used linguine, but any asian noodle works as well)$r$,$r$1. Begin by dicing chicken breast in to cubes. Marinating in soy sauce, sriracha, lime juice, and 0.25 teaspoon of each seasoning (add more chili flakes if you prefer spicier)
2. While the chicken is marinating, make the peanut sauce by combining peanut butter, soy sauce, sriracha, honey, finely chopped sun-dried tomatoes and lime juice in a small bowl, and whisk
3. Cook noodles or pasta according to package instructions. While noodles are cooking, begin cooking the chicken on a pan over medium-high heat for 4-5 minutes. Add minced garlic and the whites of green onions, cooking for another 2-3 minutes. Remove from pan and set to the side.
4. Reduce the heat to low and add the peanut sauce to the same pan, along with a third of a cup of water. Add the pasta and simmer for a few minutes.
5. Add the cooked chicken to the pasta mixture and mix. Garnish with"greens" of the green onions$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-07-spicy-peanut-sauce-noodles.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Chipotle Chicken & Bacon Alfredo$r$,535,51,62,12,0,4,$r$$r$,$r$340g skinless chicken thighs Seasoned with salt, garlic, onion, paprika, chili powder
4 slices of center cut bacon Dice, cook in pan until crispy Garnish with chives and red chili flakes Alfredo Sauce:
168g evaporated fat free milk (half a 340g can)
300g 2% cottage cheese
50g Parmigiano Reggiano
1-2 chipotle peppers
1 tablespoon adobo sauce Salt, pepper to taste
320g Protein penne$r$,$r$1. Season your chicken (even amounts of each seasoning, if you prefer to measure, mix each seasoning in a small bowl in bulk then use enough to completely cover each side of the chicken) and air fry at 375 for 12-15 minutes.
2. Begin to cook the pasta according to the instructions on the box
3. Blend all of the Alfredo sauce ingredients in a blender and blend until completely smooth
4. Dice bacon into small pieces and cook them in a pan until golden brown. Once cooked, remove them from the pan (drain excess grease), turn off heat and add in your diced chicken and pour over the creamy Alfredo sauce and cooked pasta. Mix until combined
5. Top the meal off with chives, red chili flakes, and the chopped bacon and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-08-chipotle-chicken-bacon-alfredo.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Queso Chicken & Rice$r$,515,48,51,13,0,5,$r$$r$,$r$680g chicken breast
1.5 tsp avocado oil
1.5 packets of taco seasoning of choice
300g basmati rice QUESO SAUCE:
250g 2% Plain Greek yogurt
85g red enchilada sauce
85g pico de gallo
85g cheddar cheese
100g 0.333 fat cream cheese
65g diced green chiles
20g nutritional yeast
10g brown sugar
0.5 tsp garlic powder
0.5 tsp onion powder Pinch of salt Chopped Cilantro$r$,$r$1. Rinse rice in a mesh strainer under cold water for 2 minutes, then combine with 450g of water and bring to a boil. Once boiling, reduce heat to low, cover, and let cook for 15 minutes. Remove from heat, keep covered, and let sit another 10 minutes to cook rice.
2. Tenderize chicken breasts (flatten out to an even thickness), rub with avocado oil, then cover with taco seasoning. It should be entirely covered. Place to the side and dry brine for 45-60 mins
3. Cook chicken in the air fryer at 375 for 12 minutes, let rest 5, then slice or dice
4. With heat on the lowest setting, add Greek yogurt, red enchilada sauce, pico, cheddar cheese, cream cheese, green chiles, nutritional yeast, brown sugar, garlic powder, onion powder and salt. Mix until everything is melted and combined (if it's still too thick, add a splash of milk until your desired consistency). Mix in a handful of chopped cilantro
5. Place chicken on top of rice and pour over your Queso sauce and garnish with more cilantro$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-09-queso-chicken-rice.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Loaded Cheddar Fries$r$,500,41,42,19,0,6,$r$$r$,$r$1 bag of frozen fries (I used Ore-Ida extra crispy crinkle fries). Either buy pre- seasoned, or season generously with salt, garlic, onion, paprika and cumin
2 diced sweet onions
737g 93% beef
2 packets taco seasoning
0.333 cup water
80g fat free cheddar
150g 2% or low fat cheddar Season top layer with garlic + cumin$r$,$r$1. Add your frozen fries to a baking sheet (season if you buy the unseasoned variety) and bake according to packaging instructions.
2. Place diced onions in a pan over medium-low heat - cook until caramelized. Since we aren't adding oil, make sure to use non-stick, and add a splash of water if onions begin sticking. It usually takes, minimum, 30 minutes to fully caramelize onions - but you can cook to your desired level
3. Remove onions, and add in your beef. Cook over medium high heat, then season with taco seasoning and add 0.333 cup of water. Simmer until thickened and cooked through.
4. Once fries are done, remove sheet pan from oven. Top your fries with fat free cheddar, onions, your beef mixture, then low fat cheddar for the top layer along with garlic + cumin. Broil on high for 2-4 minutes of until cheese is fully melted. Separate in to 6 even servings, and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-10-loaded-cheddar-fries.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Chicken Burrito Bowls$r$,505,45,44,16,0,5,$r$$r$,$r$680g skinless chicken thighs Season with salt, garlic, onion, smoked paprika, chili powder
300g Spanish RightRice
200g Avocado Salt, pepper, garlic powder to taste
50g green enchilada sauce Pico:
5 Roma tomatoes, diced
1 small white onion, diced Dash of salt, pepper & garlic powder Juice of 2 limes ~0.5 cup fresh chopped cilantro
1-2 small jalapeño peppers, diced Other toppings:
200g Greek yogurt (40g each) Hot sauce of choice$r$,$r$1. Preheat your air fryer to 375°F
2. Season boneless, skinless chicken thighs with each seasoning listed (even amounts of each seasoning, if you prefer to measure, mix each seasoning in a small bowl in bulk then use enough to completely cover each side of the chicken). Air fry the chicken thighs for 12-15 minutes
3. While the chicken is cooking, cook your Spanish RightRice (or use any rice of choice). Make the homemade Pico de Gallo by combining diced Roma tomatoes, diced white onion, salt, pepper, garlic powder, juice of two limes, a handful of cilantro, and diced jalapenos in a bowl. In a separate bowl, mash an avocado with salt, pepper, garlic powder and green enchilada sauce until it reaches a guacamole-like consistency.
4. Once the chicken is cooked, let rest for 5 minutes, then dice into small pieces. Divide the rice, chicken, Pico de Gallo, and avocado evenly into five meal prep containers.
5. Top each bowl with a dollop of Greek yogurt and hot sauce.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-11-chicken-burrito-bowls.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Taco Mac n Cheese$r$,510,41,62,12,0,5,$r$$r$,$r$Mac n cheese:
330g pasta
350g 2% cottage cheese
25g cheddar powder
50g Velveeta cheddar shreds
10g nutritional yeast
50g 1% milk Taco mixture:
2 yellow bell peppers
2 red bell peppers
1 onion
454g 93% beef
1 taco seasoning packet (I used Lawry’s) Splash of water
50g red enchilada sauce$r$,$r$1. Begin by dicing bell peppers and onions, and cooking on a pan over medium heat until they are softened, usually takes ~10 minutes. Start boiling salted water.
2. When the veggies are almost finished cooking, add pasta to boiling water.
3. Remove veggies from pan and start cooking beef over medium-high heat. Once nearly fully cooked, add taco seasoning, chili powder, garlic powder, a splash of water, and red enchilada sauce. Mix in the pepper and onion mixture.
4. M
5. ix the cooked pasta and beef mixture together.
6. In a blender, add add cottage cheese, cheddar powder, velveeta shreds OR low-fat cheddar cheese, nutritional yeast, and a splash of milk. Blend for 60-90 seconds to create a creamy cheese sauce. Optional: add hot sauce for extra spice.
7. Mix cheese sauce with pasta and beef mixture, and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-12-taco-mac-n-cheese.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Honey Garlic Chicken & Rice$r$,495,37,59,13,0,5,$r$$r$,$r$794g chicken breast
1 tblspn chili crisp
1 tblspn garlic powder
0.5 tblspn pepper
0.5 tblspn gochugaru
2 tblspns soy sauce
1 tblspn avocado oil
2 tblspns soy sauce
1 teaspoon minced garlic
1 tblspn chili crisp
1 tblspn sesame oil
4 tblspns honey
1 tblspn mirin
0.5 tblspn gochugaru
280g basmati rice
1 white onion Green onions (for garnish)$r$,$r$1. Tenderize the chicken breast and dice the chicken into cubes. Once diced, marinate the chicken in a bowl with a combination of chili crisp, garlic powder, pepper, gochugaru, soy sauce, and avocado oil and let sit for at least 30 minutes
2. In a different bowl, combine soy sauce, minced garlic, chili crisp, sesame oil, honey, mirin, and gochugaru to make the honey garlic sauce
3. Rinse rice in a mesh strainer under cold water for 2 minutes, then combine with 420g of water and bring to a boil. Once boiling, reduce heat to low, cover, and let cook for 15 minutes. Remove from heat, keep covered, and let sit another 10 minutes to cook rice.
4. Place the chicken in a pan in two batches on high heat until the chicken is fully cooked through
5. Once cooked, remove the chicken and saute onions until fully cooked and then combine with the cooked rice, top with cooked chicken and the honey garlic sauce, mix.
6. Top the meal off with green onions and enjoy$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-13-honey-garlic-chicken-rice.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Korean Beef Rice Bowls$r$,500,34,53,16,0,5,$r$$r$,$r$Korean beef:
680g 96% ground beef
2 tspn sesame oil
1.5 tablespoon minced garlic
30g brown sugar
80g soy sauce
20g gochujang
3 green onions
300g basmati rice Creamy Sriracha Mayo:
90g light Mayo
50g Sriracha Juice from 0.5 a lemon (about 1 tablespoon)
0.5 tspn garlic powder
2 tblspn milk or water Salt to taste$r$,$r$1. Make the sriracha mayo by mixing up all the ingredients for the sauce.
2. Rinse rice in a mesh strainer under cold water for 2 minutes, then combine with 450g of water and bring to a boil. Once boiling, reduce heat to low, cover, and let cook for 15 minutes. Remove from heat, keep covered, and let sit another 10 minutes to cook rice.
3. Make the beef marinade by combining sesame oil, minced garlic, brown sugar, soy sauce and gochujang. Cook the lean beef and add in the marinade once it's 50% cooked through. Toss in chopped green onions and let it simmer for ~5 minutes or until the beef is fully cooked.
4. Assemble 5 bowls with rice, beef, and top with the homemade sriracha mayo and sesame seeds.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-14-korean-beef-rice-bowls.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Green Chili Queso Mac n Cheese$r$,510,47,60,12,0,5,$r$$r$,$r$Green Chile queso:
400g 2% cottage cheese
45g white cheddar
1 tspn minced garlic
25g white cheddar powder (you can use cheddar powder from boxed Mac)
65g fat free milk Pinch of cilantro
1 small can of hatch green chiles Chicken:
454g skinless Chicken thighs Season equally with salt, pepper, garlic, onion, paprika, chili powder
1 box Barilla protein pasta (411g) or pasta of choice$r$,$r$1. Begin by seasoning boneless, skinless chicken thighs (even amounts of each seasoning, if you prefer to measure, mix each seasoning in a small bowl in bulk then use enough to completely cover each side of the chicken). Cook in air fryer at 375 for 12-15 minutes. Once cooked, dice the chicken into small pieces.
2. Cook your choice of pasta according to the instructions on the package.
3. Prepare the green chili queso sauce by mixing all the listed ingredients, microwave for 30 seconds, and blending until smooth.
4. Add the cooked pasta to a bowl and mix it with the green chili queso sauce.
5. Assemble the bowls by adding the diced chicken, a little hot sauce, pico de gallo, and cilantro on top of the mac and cheese. Enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-15-green-chili-queso-mac-n-cheese.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Creamy Chicken Pesto Pasta$r$,505,51,42,18,0,5,$r$$r$,$r$567g skinless chicken thighs Garlic, salt + pepper, Italian seasoning
280g Protein Penne pasta Creamy Pesto Sauce:
10 cloves minced garlic
25g of basil
125g 1% milk
50g 0.333 fat cream cheese
250g 2% cottage cheese
125g Parmigiano-Reggiano
25g store bought pesto$r$,$r$1. Season two boneless, skinless chicken thighs with salt, pepper, garlic, and Italian seasoning (even amounts of each seasoning, if you prefer to measure, mix each seasoning in a small bowl in bulk then use enough to completely cover each side of the chicken). Give them a quick sear on each side and finish them off in an air fryer at 375 for 10 minutes
2. While the chicken is cooking, start cooking your high protein pasta in a separate pot.
3. In the same pan used to sear the chicken, cook the minced garlic over medium heat for about 2-3 minutes, reduce heat to the lowest setting and add basil and the rest of the pesto sauce ingredients. The goal is to lightly warm up the sauce ingredients here. Transfer to a blender and blend until completely smooth.
4. C
5. hop cooked chicken into small pieces. Add the cooked pasta to a mixing bowl, pour over the pesto sauce, and toss in the chopped chicken thighs, and mix$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-16-creamy-chicken-pesto-pasta.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Snack$r$,600,$r$Pepperoni Pizza Bagel Bites$r$,515,30,65,17,0,5,$r$$r$,$r$10 English muffins
400g Marinara
50g "umami" black garlic sauce (found at Whole Foods) or low sodium soy sauce
33g parmigiano reggiano
60g chopped hot peppers
200g 2% Mozzarella
60 slices turkey pepperoni
33g hot honey$r$,$r$1. Preheat your oven to 450°F
2. Split and lightly spray each half of the English muffins with oil spray, and place them on a baking sheet. Bake in the oven for approximately 5 minutes, or until crispy.
3. Once the English muffins are done, remove them from the oven and add marinara sauce, diced peppers, shredded mozzarella cheese, and pepperoni slices to each half.
4. Drizzle some hot honey over the top of each muffin half, and then place them back in the oven for another 5 minutes, or until the cheese is melted and bubbly.
5. Remove them from the oven and top with freshly grated parmesan cheese, oregano, and basil. Each "serving" is 4 pizzas - separate in to your containers of choice, and store frozen.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-17-pepperoni-pizza-bagel-bites.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Honey Garlic Chili Crisp Noodles$r$,505,40,63,11,0,5,$r$$r$,$r$709g chicken breast
1 tablespoon garlic
2 tspn salt (adjust to taste)
1 teaspoon paprika
1 teaspoon pepper
1 tablespoon soy sauce
1 tablespoon chili crisp (jarred condiment found in most asian aisles)
1 tablespoon honey
1 tablespoon sriracha
5 dried ramen packets (400g of noodle Sauce:
1 tspn corn starch
75g Soy Sauce
25g Miso
25g Chili Crisp or Chili Oil
10g Sesame Oil
10g Honey Garnish with chili crisp, sesame seeds, and green onions$r$,$r$1. Place the chicken breast in a large bowl and create a marinade with garlic, coarse salt, paprika, pepper, soy sauce, chili crisp, honey, and sriracha, mix it until combined and let marinate for at least 30-60 minutes
2. Add the marinaded chicken to the air fryer for 12 minutes at 400
3. Combine all sauce ingredients, beginning with the corn starch, and mix until fully combined. Note: I typically use the "Momofuku Spicy Soy" noodle packages, which come with a sauce packet, so you could also use this instead of making a sauce - I just wanted to make the recipe accessible for people who didn't have access to that specific product!
4. Fully cook the noodles using the instructions on the packet
5. Once cooked, combined the noodles with the sauce and then cut the cooked chicken into slices and place on top of the noodle mixture and top the meal with chili crisp, sesame seeds, and green onions$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-18-honey-garlic-chili-crisp-noodles.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Buffalo Chicken Mac n Cheese$r$,505,39,59,14,0,5,$r$$r$,$r$Chicken:
510g skinless chicken thighs
40g Buffalo sauce
20g soy sauce
0.5 teaspoon each: Old bay seasoning, garlic powder & smoked paprika
325g pasta
300g 2% cottage cheese
150g 0.333 fat cream cheese
25g Cheddar powder
75g Buffalo sauce
30g soy sauce
30g honey$r$,$r$1. Slice chicken thighs in to strips, and marinate in buffalo sauce, soy sauce, Old Bay, garlic powder, and smoked paprika for at least 30 minutes. On a grill, cook chicken over high heat for 2 minutes on each side until it's cooked through. Dice up the chicken into bite-sized pieces. (You can also air fry at 375 for 12 minutes, or pan fry)
2. Start cooking your pasta according to package instructions.
3. In a blender, blend cottage cheese, cream cheese, cheddar powder, buffalo sauce, soy sauce, and honey until smooth.
4. Drain the pasta and add it to a large mixing bowl. Pour the cheese sauce over the pasta and stir well. Add the diced buffalo chicken and mix again. Seperate in to 5 servings, and enjoy.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-19-buffalo-chicken-mac-n-cheese.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Italian Meatball Pasta$r$,510,45,60,11,0,5,$r$$r$,$r$Meatballs:
680g 96% beef
0.25 cup breadcrumbs
80g milk
30g fresh parmigiano reggiano
1.5 tsp salt
1.5 tablespoon minced garlic
1 tspn red chili flakes
2 tspn fresh basil Black pepper
1 tspn soy sauce Sauce:
1 medium white onion
1 stalk of celery
1 medium carrot, peeled and chopped
4 cloves garlic
1 can San Marzano tomatoes
1 tblspn gochujang Couple leaves of fresh basil
30g Parmigiano reggiano
300g pasta$r$,$r$1. Make the meatball mixture by combining bread crumbs, Parmesan Reggiano, seasonings, minced garlic, fresh basil, milk and soy sauce with 96% lean ground beef. Form the mixture into 20 equally sized meatballs.
2. Bake the meatballs in the oven at 400°F for 8 minutes.
3. In a separate pot, prep sauce: Add chopped onion/celery/carrot to a non-stick pot or pan over medium low heat. Simmer until translucent. Add minced garlic & gochujang, simmer for 1-2 mins, then add in your canned tomatoes. Add salt and pepper to taste, then blend. Add in chopped basil, place on lowest heat setting
4. Add the meatballs to the sauce, cover and let simmer for about 20 minutes to infuse the meatballs with the marinara flavor.
5. Cook pasta of choice, add all excess marinara sauce from meatballs to the pasta and mix. Separate in to 5 servings, top with meatballs and parmigiano, and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-20-italian-meatball-pasta.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Pepperoni Pizza Mac n Cheese$r$,505,35,59,18,0,5,$r$$r$,$r$336g Protein penne
600g 1% milk
360g 2% cottage cheese
40g Parmigiano Reggiano
70g Cheddar cheese
120g Marinara sauce
55g Chopped pepperoni
25g All Purpose Flour$r$,$r$1. This one is very simple - add every ingredient to a large pot and turn the heat to medium-high. I like to slice the pepperoni's in to fourths, and make sure to finely shred fresh parmigiano reggiano for best results.
2. Once the mixture begins to bubble, reduce the heat to 0.3, place a lid on top of the pot, and set a timer for 20 minutes. Remove the lid every ~3 minutes to stir the mixture.
3. Remove the lid and let the mixture sit for approximately 5-10 minutes until fully thickened. *Alternatively, you can also cook the pasta in water, blend all the sauce ingredients separately and lightly sautee the pepperonis. You'll likely need to reduce the milk quantity to ~100g if you do this, however, and it will lower the calories/macros a bit! I used normal pepperoni's - but turkey pepperoni could also be used for lower calories/fat$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-21-pepperoni-pizza-mac-n-cheese.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Butter Chicken Rice Bowls$r$,510,44,54,13,0,5,$r$$r$,$r$680g chicken breast
180g 0% greek yogurt
1 tbsp garam masala
1 tbsp Kashmiri red chilli powder
1 tsp salt
3 cloves garlic, minced
300g basmati rice White Sauce:
100g Greek yogurt
50g milk
1 tspn garlic powder Pinch of salt Sauce:
30g light butter
1 onion chopped
6 cloves garlic minced
2 tsp Ground cumin
1.5 tsp Kashmiri red chilli powder
1.5 tsp Coriander
0.75 tsp Garam masala
2 cans 397g crushed tomatoes
30g cashews
80g milk Pinch of salt$r$,$r$1. Tenderize chicken breast and cut into cubes. Marinate in yogurt, spices, and minced garlic for 45- 60 minutes. Longer = better.
2. Rinse rice in a mesh strainer under cold water for 2 minutes, then combine with 450g of water and bring to a boil. Once boiling, reduce heat to low, cover, and let cook for 15 minutes. Remove from heat, keep covered, and let sit another 10 minutes to cook rice.
3. Cook chicken over high heat for 3-4 minutes on each side, then place in a bowl on the side
4. Add half the light butter to the same pan and cook the onions for about 5 minutes. Add garlic, cumin, kashmiri chili powder, coriander and garam masala and mix. Next, add 2 cans of diced tomatoes and cashews and let it simmer for 15 minutes. Blend the sauce with the rest of the light butter and milk.
5. Combine the chicken and sauce, let it simmer, then separate the rice in to 5 servings and top with the butter chicken, a drizzle of the white sauce, red onions and cilantro.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-22-butter-chicken-rice-bowls.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Everything Bagel Chicken Alfredo$r$,510,51,54,12,0,5,$r$$r$,$r$320g Protein penne
340g evaporated fat free milk
350g 2% cottage cheese
100g Parmigiano Reggiano Salt, pepper to taste
1.5 tablespoon everything bagel seasoning
454g skinless chicken thighs Season with salt, garlic, onion, pepper$r$,$r$1. Season your chicken thighs (even amounts of each seasoning, if you prefer to measure, mix each seasoning in a small bowl in bulk then use enough to completely cover each side of the chicken) and air fry at 375 for 12-15 minutes or until cooked through. Let rest for 5 minutes, then chop into small pieces and set aside.
2. In a blender, combine low-fat cottage cheese, fat-free or 2% evaporated milk, and high-quality Parmigiano Reggiano. Microwave the mixture for a minute, then blend until smooth.
3. Cook any pasta of your choice and toss it in a pan with the alfredo sauce. Let it simmer on low heat to let the sauce absorb into the pasta.
4. Once the pasta is coated in the sauce, add the chopped chicken and mix it in. S prinkle everything bagel seasoning on top of the dish and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-23-everything-bagel-chicken-alfredo.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Pollo Asado Burrito Bowls$r$,500,50,52,10,0,5,$r$$r$,$r$794g skinless chicken thighs
0.5 cup orange juice
4 tblspns soy sauce
2 tblspns lime juice
8 cloves garlic
2 tspn cumin
1 tspn salt
1 tspn black pepper
1 tspn onion
3 dried ancho chiles
3 chipotle peppers
20g honey
1 Handful cilantro
5 Bell peppers
2 onions
1 packet of taco seasoning
300g Spanish RightRice
100g plain Greek yogurt
50g hot sauce Pinch of salt Add milk/water 1 tspn at a time until desired consistency Top with Pico, hot sauce, and red onions$r$,$r$1. Start by prepping the marinade by blending together orange juice, soy sauce, lime juice, garlic, cumin, salt, black pepper, onion, chipotle peppers, honey, and cilantro. Place dried ancho chiles on a plate, cover with a damp paper towel, and microwave for 45-60 seconds to rehydrate, then blend in to marinade. Combine with boneless skinless chicken thighs and let it marinate for at least an hour.
2. Preheat your oven to 450°F. Dice your veggies (bell peppers and onions) and toss them with taco seasoning. Spread them out on a baking sheet and bake for about 30 minutes until soft.
3. While the veggies are cooking, cook your rice according to the package instructions.
4. When the veggies are nearly done, toss the marinated chicken in the air fryer at 400 for 12-15 minutes
5. Assemble your bowl by layering rice, fajita veggies, diced chicken, red onions, hot sauce, and cilantro. Enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-24-pollo-asado-burrito-bowls.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Chicken Bulgogi Rice Bowls$r$,495,41,53,13,0,5,$r$$r$,$r$907g skinless chicken thighs, tenderized and sliced into strips Marinade:
4 tbsp gochujang
2 tbsp soy sauce
3 tbsp brown sugar
2 tbsp minced garlic
1 tsp ginger paste
1.5 tbsp mirin
1 tbsp sesame oil
0.5 tsp black pepper Cucumber Salad:
400g diced cucumbers
400g diced tomatoes Juice of half a lemon Salt + pepper to taste
280g basmati rice
1 bag salad mix of choice (optional) Leftover marinade (simmered)
3 tablespoons black garlic Umami sauce (found at Whole Foods) or soy sauce Splash of Sriracha$r$,$r$1. Make the marinade by mixing up all the ingredients and marinate the chicken for at least 30 minutes to an hour. If you can do longer, that will yield better results - overnight is best.
2. Prepare the cucumber salad by combining all ingredients
3. Rinse rice in a mesh strainer under cold water for 2 minutes, then combine with 420g of water and bring to a boil. Once boiling, reduce heat to low, cover, and let cook for 15 minutes. Remove from heat, keep covered, and let sit another 10 minutes to cook rice.
4. Air fry the marinated chicken at 400 for 12 minutes until fully cooked, work in 2-3 batches if needed.
5. Take any excess marinade and simmer until bubbling, add in Umami sauce or Soy sauce with a little bit of sriracha. Mix in cooked rice and salad pack (optional)
6. Combine all finished ingredients together and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-25-chicken-bulgogi-rice-bowls.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Halal Cart-style Chicken & Rice$r$,505,43,50,15,0,5,$r$$r$,$r$709g chicken breast
226g 0% greek yogurt
40g olive oil
2 tblspn shawarma seasoning or 7 spice
2 tspn smoked paprika
1 tblspn minced garlic
1 tspn salt Diced Roma tomatoes & cilantro or parsley
1 small onion
1 tblspn butter
1 tspn turmeric
0.5 tspn cumin
1 tspn sea salt
300g basmati rice, rinsed
2.75 cups of chicken broth
226g 0% greek yogurt Juice of 0.5-1 lemon
1 tblspn honey
1 tspn garlic powder
0.5 tspn Salt
60g milk (~4 tblspns)$r$,$r$1. Slice the chicken breast thin and dice into cubes, and then marinate in a bowl with Greek yogurt, olive oil, shawarma seasoning, smoked paprika, minced garlic, salt and marinate for at least 1 hour - longer = better.
2. Dice up an onion and place in a pot until they are fully translucent and most water has been cooked off, and then toss in a spice mix of turmeric, cumin, and sea salt. Mix in rinsed uncooked rice and chicken broth. Bring the combination to a boil, cover, and reduce heat to low and cook for 15 minutes. Remove from heat, keep covered, and let sit for another 10 minutes.
3. Place the marinated chicken in the air fryer for 12 minutes at 400 (cook in batches if needed)
4. Combine all the ingredients for the white sauce, mix thoroughly, then assemble your rice bowls and garnish with diced roma tomatoes and cilantro.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-26-halal-cart-style-chicken-rice.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Jalapeño Popper Mac n Cheese$r$,510,40,65,12,0,5,$r$$r$,$r$397g chicken breast Seasoned with salt, garlic, onion, pepper, paprika
10 slices of center cut bacon
380g elbow pasta
300g 2% cottage cheese
80g light cream cheese
60g 1% milk
10 diced pickled jalapeño pieces
2 tablespoons pickled jalapeño juice
25g honey Salt, pepper to taste Garnish with chives$r$,$r$1. Tenderize the chicken breast and season generously with salt, garlic, onion, pepper, and paprika (even amounts of each seasoning, if you prefer to measure, mix each seasoning in a small bowl in bulk then use enough to completely cover each side of the chicken)
2. Once seasoned, cook the chicken in the air fryer for 12 minutes at 375
3. In a blender, add cottage cheese, cream cheese, 1% milk, jalapeno pieces, pickled jalepeño juice, honey, salt and pepper to taste and blend until smooth
4. Cook the pasta according to the instructions on the box. Dice 10 pieces of bacon into small cubes and cook on a pan on medium-high heat until it reaches your desired level of crispiness
5. Once the bacon is cooked, remove from the pan, drain excess grease and turn off the heat. Once the heat is off, pour the jalapeño sauce in the pan and combine it with the cooked pasta and cooked chicken. Top the meal off with the crispy bacon and chives and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-27-jalape-o-popper-mac-n-cheese.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$White Cheddar Truffle Mac$r$,500,38,61,10,0,6,$r$$r$,$r$3 boxes of Mac N Cheese
600g cottage cheese
6g truffle oil (1 tspn)
340g thin sliced chicken breast Seasoned with salt, garlic & pepper
1 tsp White Wine Vinegar (or Lemon Juice)$r$,$r$1. Season chicken breast evenly with salt, garlic, pepper, and splash it with white wine vinegar (or lemon juice)
2. Place the chicken in the air fryer at 375 for 8 minutes until fully cooked through. A secondary option would be to just use shredded rotisserie chicken instead of cooking your own.
3. Blend cheese packets from Mac N Cheese boxes with cottage cheese and truffle oil in a blender for about 60-90 seconds until smooth
4. Cook pasta from the Mac N Cheese box according to the instructions on the box
5. Dice up the chicken and stir it in a separate pan with the cooked pasta and the sauce and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-28-white-cheddar-truffle-mac.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Cajun Chicken Alfredo$r$,515,46,45,18,0,5,$r$$r$,$r$425g chicken breast
2.5 tspn Cajun seasoning + salt (if Cajun seasoning has no sodium)
10g olive oil, splash of Lemon juice
2 links Andouille Chicken sausage (I used Good & Gather brand)
280g Protein Penne pasta
110g 0.333 fat cream cheese
50g Parmigiano-Reggiano
80g mozzarella
2.5 tspn Cajun seasoning
350ml 1% milk Salt to taste
2.5 tablespoon chopped parsley
2.5 tablespoon chopped chives$r$,$r$1. Dice the chicken breast into cubes and marinate in olive oil, lemon juice, and Cajun season + salt
2. Chop the Andouille sausage into small pieces and set aside for later
3. Cook the pasta according to the instructions on the box
4. Place the chicken on a pan on medium-high heat and cook it on both sides until fully cooked and then add in the chopped sausage. Cook for 2-3 more minutes.
5. Remove the chicken and sausage from the pan and create the sauce by melting down cream cheese and adding in milk, mozzarella, Parmigiano-Reggiano and cajun seasoning over low heat
6. Once combined, add back in the chicken, sausage, cooked pasta and top it off with chopped parsley and chives and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-29-cajun-chicken-alfredo.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Southwest Chicken & Veggie Orzo$r$,510,41,59,13,0,6,$r$$r$,$r$680g boneless skinless chicken thighs Seasoned with salt, garlic, onion, smoked paprika, cumin, dash of cinnamon
336g orzo
3 cans Amy’s southwestern vegetable soup
340g vegetable or chicken broth Hot sauce of choice
120g 2% cheddar
240g 2% plain Greek yogurt$r$,$r$1. Add soup, vegetable broth and seasonings to a pot and bring to a boil. Add as much of any seasonings you like, be generous with the seasoning quantity!
2. Add in Orzo, cover and cook for ~10 minutes
3. While the orzo is cooking, season chicken thighs (even amounts of each seasoning except for cinnamon, if you prefer to measure, mix each seasoning in a small bowl in bulk then use enough to completely cover each side of the chicken) and add to air fryer at 375 for 12 minutes and chop into small pieces when fully cooked
4. Reduce heat on orzo to low, remove lid, and stir and simmer until pasta has absorbed all the liquid thickened
5. Add in chicken, cheddar and Greek yogurt, mix, and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-30-southwest-chicken-veggie-orzo.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Cheesy Butternut Orzo$r$,510,39,68,11,0,5,$r$$r$,$r$454g boneless skinless chicken thighs Season with: Salt, garlic, onion, pepper, paprika, chipotle chili powder
364g orzo
500g cubed butternut squash
10g olive oil
150g cottage cheese
50g parmigiano reggiano
100ml 1% milk Salt, garlic, pepper (to taste)$r$,$r$1. Cube one butternut squash, weigh out 500g
2. Add 10g of olive oil, roast at 400 for 30 minutes or until fork tender. Blend with cheese ingredients to make sauce. Make sure to blend to ~2 minutes so sauce gets completely smooth
3. While the orzo is cooking, season chicken thighs (even amounts of each seasoning, if you prefer to measure, mix each seasoning in a small bowl in bulk then use enough to completely cover each side of the chicken) and add to air fryer at 375 for 12 minutes and chop into small pieces when fully cooked
4. Drain pasta, toss with the butternut cheese sauce, then top with your chipotle chicken and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-31-cheesy-butternut-orzo.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Spicy Tomato Chicken Pasta$r$,500,36,56,16,0,5,$r$$r$,$r$794g diced chicken breast Marinade:
180g chopped sundried tomatoes
30g tomato paste
30g low sodium soy sauce
15g olive oil
0.5 tsp each: S alt, pepper, garlic, red chili flakes
336g Pasta
200g Arrabiata (or any marinara)
80g 1% milk
100g 0.333 fat cream cheese
30g honey$r$,$r$1. Flatten and dice up chicken breast into cubes. Add chopped sundried tomatoes, tomato paste, soy sauce, olive oil, and seasonings to marinade the chicken
2. Cook the pasta according to the instructions on the box
3. Brown chicken over medium high heat on both sides until fully cooked through
4. Once cooked through, reduce heat, and add in store bought marinara, 1% milk, 0.333 fat cream cheese, honey, the cooked pasta and combine$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-32-spicy-tomato-chicken-pasta.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,500,$r$Breakfast Mac n Cheese$r$,500,51,37,20,0,6,$r$$r$,$r$336g Protein pasta
360g 2% cottage cheese
45g 2% cheddar
30g Parmigiano Reggiano
21g powdered cheddar
90g milk
1.5 tspn garlic powder
1.5 tspn smoked paprika
1 tspn rubbed sage
9 slices bacon, diced
425g turkey sausage$r$,$r$1. Dice bacon and cook in a pan over medium heat along with your turkey sausage of choice
2. Cook pasta according to packaging instructions
3. Add cottage cheese, cheddar, parmigiano, cheddar powder, milk, garlic powder, smoked paprika, and rubbed sage to a blender and blend until completely smooth.
4. In the same pan you cooked your turkey bacon and sausage, pour over your cheese sauce (turn off heat), mix with bacon and sausage, and pour over your cooked pasta to combine. Split in to 6 even servings, and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-33-breakfast-mac-n-cheese.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Chimichurri Pasta w/ BBQ Chicken$r$,510,38,53,17,0,6,$r$$r$,$r$907g boneless skinless chicken thighs
30g soy sauce
15g Worcestershire
90g sugar free bbq sauce
1 tsp each: Garlic powder, chili powder, smoked paprika
384g Linguine or pasta of choice
0.75 cup fresh cilantro
12 cloves garlic
60g olive oil
120g lemon juice (or red wine vinegar)
1.5 teaspoon red chili flakes
2.25 teaspoon dried oregano
3 level teaspoon coarse salt
0.75 tspn pepper
30g honey
1 cup of pasta water$r$,$r$1. In a bowl, mix together the ingredients for the barbecue marinade. Add chicken thighs to the marinade and let them sit while you prepare the chimichurri sauce
2. Finely chop cilantro or parsley and mix with other chimichurri ingredients, using minimal olive oil to keep the calorie count low.
3. Preheat your grill to high heat. Place the marinated chicken on the grill, cook until nicely charred and the internal temperature reaches 165°F
4. Bring a pot of salted water to a boil and cook the pasta according to the package instructions. In a pan over low heat, heat the chimichurri sauce, adding 0.333 cup of pasta water (pull from the pasta pot once the pasta is ~1 minute away from being done cooking). Once the pasta is cooked and drained, toss it with the chimichurri sauce
5. Top the chimichurri pasta with grilled barbecue chicken and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-34-chimichurri-pasta-w-bbq-chicken.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Spicy Sausage Pasta$r$,505,40,61,15,0,5,$r$$r$,$r$397g Turkey sausage
1 box Barilla protein pasta (411g) or pasta of choice
200g 2% cottage cheese
200g Arrabiata
50g parmigiano reggiano Red chili flakes Garlic, black pepper
10g honey$r$,$r$1. In a blender, combine low-fat cottage cheese, store bought arrabbiata (or any marinara sauce), freshly grated Parmigiano Reggiano cheese, red chili flakes, a dash of garlic powder and black pepper, and honey. Blend until completely smooth
2. Using turkey sausage of choice, cook over high heat and crumble in to small pieces.
3. Once the sausage is cooked, turn off heat (make sure to allow time for pan to cool), then pour over the sauce and mix
4. Cook the pasta according to the package instructions. Drain the pasta, reserving some pasta water. Toss the cooked pasta with the sausage and cheese sauce, and add pasta water if it's too thick.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-35-spicy-sausage-pasta.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Honey Habanero Chicken and Rice$r$,500,39,54,15,0,5,$r$$r$,$r$907g skinless chicken thighs
60g habenero hot sauce
60g honey Drops of lime
40g Mayo Pinch of salt
280g basmati rice
2 tablespoons olive oil
2 tablespoons lime
1 tspn salt Cilantro$r$,$r$1. Mix together habanero hot sauce, honey, lime juice, mayo, and a pinch of salt to create coating for the chicken thighs. Cover chicken using 90% of the sauce and let marinate for at least 30 minutes, longer = better. Reserve leftover sauce to brush on chicken during cooking
2. Place chicken in the air fryer at 375 for 12 minutes. Remove, brush with leftover sauce, then add back to the air fryer for 2-3 more minutes.
3. Rinse rice in a mesh strainer under cold water for 2 minutes, then combine with 420g of water and bring to a boil. Once boiling, reduce heat to low, cover, and let cook for 15 minutes. Remove from heat, keep covered, and let sit another 10 minutes to cook rice.
4. Once rice is done cooking, mix in olive oil, lime juice, salt, and a handful of finely chopped cilantro.
5. Seperate rice in to 5 equal servings, top with chicken, and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-36-honey-habanero-chicken-and-rice.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Honey BBQ Chicken Mac n Cheese$r$,510,43,59,12,0,5,$r$$r$,$r$325g pasta
300g 2% cottage cheese
120g 2% cheddar cheese
25g Cheddar powder
60g BBQ sauce
3g Nutritional yeast Garlic, onion, pepper & salt to taste
510g skinless chicken thighs BBQ dry rub of choice$r$,$r$1. Season your chicken thighs generously with any BBQ dry rub of choice - I use the Salt Lick brand, but any works. Let marinate for 45-60 minutes
2. Place chicken in the air fryer at 400 degrees for 12 minutes. Chop in to cubes once done.
3. Cook pasta according to the instructions on the box, reserve 0.333 cup of pasta water, and mix your sauce with the pasta until completely coated.
4. Combine cottage cheese, cheddar cheese, cheddar powder, BBQ sauce, nutritional yeast, 0.333 cup of pasta water, and a pinch of garlic powder, onion powder, pepper and salt. Blend until completely smooth. Pour over your cooked pasta and mix to combine.
5. Mix in your BBQ chicken, and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-37-honey-bbq-chicken-mac-n-cheese.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Korean Beef & Cheesy Gochujang Pasta$r$,515,38,62,13,0,5,$r$$r$,$r$454g 96% ground beef
2 tspn sesame oil
20g cup brown sugar
60g cup soy sauce
10g gochujang
2 green onions, only greens
1 tablespoon garlic, minced
375 Protein Penne pasta
75g 2% cheddar
50g cream cheese
10g nutritional yeast
1 tablespoons gochujang
200ml 1% milk Salt to taste$r$,$r$1. In a bowl, combine sesame oil, brown sugar, soy sauce and gochujang
2. In a large pan, add 1 tablespoon of minced garlic and cook until fragrant. Add 96% lean beef to the pan and cook until it's about 50% done. Pour the marinade over the beef and continue to cook, simmering until it's cooked through. Stir in finely chopped green onions and mix well
3. In a blender, combine low-fat cheddar, cream cheese, nutritional yeast, gochujang, milk and salt and blend until completely smooth.
4. Cook the pasta according to the package instructions. Drain the pasta, reserving some pasta water. Toss the cooked pasta with the prepared cheese sauce, simmer over low heat until thickened and add pasta water if needed. Finally, top the pasta with the korean beef and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-38-korean-beef-cheesy-gochujang-pasta.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Creamy Roasted Red Pepper Pasta$r$,500,40,63,11,0,5,$r$$r$,$r$510g skinless chicken thighs
1 tspn onion
1.5 tspn garlic
1.5 tspn salt
1.5 tspn paprika
392g pasta
100g cottage cheese
150ml 1% milk
120g Roasted red peppers
80g Parmesan Salt, pepper, garlic$r$,$r$1. In a blender, combine low-fat cottage cheese, milk, roasted red peppers, fresh parmigiana reggiano, and salt/pepper/garlic powder to taste. Blend until completely smooth
2. Season your chicken thighs evenly with the seasoning blend, marinate for 30 minutes, then pan fry over medium high heat until cooked through.
3. Remove chicken from the pan and remove pan from heat, then pour over your cheese sauce, making sure to mix thoroughly and pick up any flavor left behind by the chicken.
4. Cook the pasta according to the package instructions. Drain the pasta, reserving some pasta water. Toss the cooked pasta with the cheese sauce until combined.
5. Dice your chicken then mix with your pasta, and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-39-creamy-roasted-red-pepper-pasta.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Creamy Southwestern Chicken & Rice$r$,505,41,58,13,0,5,$r$$r$,$r$794g skinless chicken thighs Seasoned with salt, garlic, onion, smoked paprika, chili powder
80ml Mexican crema
60g Greek yogurt
35g 1% milk
5g honey Pinch of salt
2 tspns diced chipotle peppers in adobo
0.25 tspn lime juice
280g basmati rice
2 cans Amy’s southwestern vegetable soup (or veggie soup of choice)
240ml chicken bone broth
1 tablespoon soy sauce Seasonings of choice Cilantro$r$,$r$1. Season chicken thighs (even amounts of each seasoning, if you prefer to measure, mix each seasoning in a small bowl in bulk then use enough to completely cover each side of the chicken) and add to air fryer at 375 for 12 minutes and chop into small pieces when fully cooked
2. Rinse rice in a mesh strainer under cold water for 2 minutes, then combine with 2 cans of veggie soup, bone broth, soy sauce and any other seasonings of choice, and bring to a boil. Once boiling, reduce heat to low, cover, and let cook for 15 minutes. Remove from heat, keep covered, and let sit another 10 minutes to cook rice.
3. Combine sauce ingredients in a blender and blend until completely smooth.
4. Separate rice in to 5 equal servings, top with sliced chicken, and pour over your chipotle sauce, garnish with chopped cilantro and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-40-creamy-southwestern-chicken-rice.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Spicy Taco Bowls$r$,515,44,53,14,0,5,$r$$r$,$r$794g 93% beef
2 diced onions
2 packets taco seasoning
320g basmati rice
15g butter
300g Greek yogurt
75g jalapeño
10g honey Handful of cilantro Salt, pepper, garlic onion to taste Pico de Gallo$r$,$r$1. Rinse rice in a mesh strainer under cold water for 2 minutes, then combine with 480g of water and butter and bring to a boil. Once boiling, reduce heat to low, cover, and let cook for 15 minutes. Remove from heat, keep covered, and let sit another 10 minutes to cook rice.
2. Add two diced onions to a pan over medium heat, cook until translucent. Remove from pan, and cook beef until brown and cooked through. Add in taco seasoning packets and onions and mix to combine. (add a splash of water if needed)
3. Combine sauce ingredients in a blender and blend until completely smooth.
4. Mix rice with your beef mixture, mix in your sauce, garnish with more cilantro and Pico, and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-41-spicy-taco-bowls.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Creamy Chipotle Chicken Pasta$r$,495,44,56,14,0,8,$r$$r$,$r$907g chicken thighs
1 tablespoon olive oil
6 cloves minced garlic
1 tspn salt
2 Tspn cumin
2 Tspn smoked paprika
2 Tspn chili powder
4 tablespoons adobo sauce
2 chipotle peppers
2 tablespoons honey Juice of 2 limes
1 white onion Chipotle cream sauce
4 chipotle peppers
200g Greek yogurt
60g light Mayo
2 limes
4 tablespoons adobo sauce
1 tablespoon honey
2 tspn smoked paprika
2 tspn garlic powder ~0.75 cup of milk Fresh cilantro
680g Banza (or pasta of choice)$r$,$r$1. Marinate boneless skinless chicken thighs in olive oil, minced garlic, salt, cumin, smoked paprika, chili powder, adobo sauce, minced chipotle peppers honey and the juice of two limes. Let sit for at least 30-60 minutes.
2. Start cooking chicken over medium high heat - once 50% cooked, add in your onions and cook until onions are soft and the chicken is cooked through.
3. Cook pasta according to packaging instructions - and mix all the ingredients for the chipotle sauce in a blender and blend until smooth.
4. Combine chicken, pasta, and chipotle cream sauce in a pot, mix. then split in to 8 even servings and enjoy!,$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-42-creamy-chipotle-chicken-pasta.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Creamy Fajita Chicken Orzo$r$,500,48,58,11,0,6,$r$$r$,$r$907g thin sliced chicken breast Handful of cilantro
2 tblspn lime juice
1.5 tblspns honey
1 tblspn olive oil
1 tblspn garlic
1 tsp chili powder
1 tsp paprika
1 tsp cumin
2 tsp kosher salt
0.5 tsp black pepper
0.333 cup water
4 bell peppers
1 sweet onion
220g 0% Greek yogurt
1 tablespoon chipotle hot sauce
100g mozzarella
380g orzo$r$,$r$1. Marinate thin sliced chicken breast in cilantro, lime juice, honey, olive oil, garlic, chili powder, paprika, cumin, salt, blacker pepper, and water. Marinate at least 30 minutes.
2. Chop 4 bell peppers (any color), 1 sweet onion, add a generous amount of salt and add to the oven at 450 degrees for 40 minutes, mixing 2-3 times.
3. Once veggies are nearly done, add your chicken to the air fryer at 375 for 9 minutes (work in two batches if needed). Once done, chop in to small pieces.
4. Mix chopped chicken, pepper/onion mix, greek yogurt, chipotle hot sauce and mozzarella in a large bowl and mix
5. Cook orzo according to packaging instructions. Reserve ~0.333 cup of pasta water in case it is needed. Mix orzo with creamy fajita chicken mix - add pasta water if needed to thin out the sauce. Enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-43-creamy-fajita-chicken-orzo.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$The Original Beefy Cheesy Burrito$r$,365,28,35,13,0,6,$r$$r$,$r$454g 93% beef
1 packet of taco seasoning
200g 2% Greek yogurt
100g red enchilada sauce
2 laughing cow cheese wedges
2 tablespoons chopped cilantro
60g 2% cheddar
6 burrito tortillas$r$,$r$1. Brown the ground beef on medium-high heat until fully cooked through and add in a packet of taco seasoning and about 1 TBSP of water. Optionally, add a dash of garlic powder, onion powder, and smoked paprika
2. Once fully combined, pour beef mixture into a bowl, and mix in greek yogurt, red enchilada sauce, laughing cow cheese wedges, chopped cilantro, and 2% cheddar cheese
3. Evenly distribute the mixture across 6 burrito sized tortillas, and wrap the burrito into aluminum foil or parchment paper, then store in the freezer
4. REHEAT INSTRUCTIONS: Microwave wrapped in a damp paper towel for 1 minute, 15 seconds (flip halfway) to defrost. Air fry at 360 for 6-7 minutes to crisp up tortilla and finish cooking interior (timing may vary based on appliance). Let sit for 5 minutes before eating.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-44-the-original-beefy-cheesy-burrito.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Cajun Chicken Mac n Cheese Burrito$r$,465,36,48,13,0,11,$r$$r$,$r$325g pasta
300g 2% cottage cheese
60g mozzarella cheese
60g cheddar cheese
25g Cheddar powder
3g Nutritional yeast
1 tablesooon Cajun seasoning
100g milk
1 tablespoon of Louisiana hot sauce or buffalo sauce
510g chicken breast Juice of 1 lemon
1 tablespoon olive oil
1 tablespoon Cajun seasoning
1 tablespoon salt
0.5 tablespoon pepper
1 tspn garlic powder
300g Greek yogurt
100g mozzarella Hot sauce
11 burrito tortillas (I used the new Counter Protein Tortillas)$r$,$r$1. Marinate your chicken breast with lemon juice, olive oil, cajun seasoning, salt, pepper and garlic powder. Marinate for at least 30 minutes.
2. Cook chicken in a pan over medium high heat - flip every 1-2 mins until cooked through.
3. Place all cheese sauce ingredients in a blender and blend until completely smooth. Once chicken is done cooking, remove from pan, turn off the heat, and pour over your sauce (make sure the pan isn't too hot) to collect all the flavor left behind by the chicken. Dice chicken
4. Cook pasta according to the instructions on the box. Once cooked, mix in sauce & diced chicken until completely combined. Evenly distribute across 11 tortillas, and store frozen
5. REHEAT INSTRUCTIONS: Microwave wrapped in a damp paper towel for 1 minute, 15 seconds (flip halfway) to defrost. Air fry at 360 for 6-7 minutes to crisp up tortilla and finish cooking interior (timing may vary based on appliance). Let sit for 5 minutes before eating. *NOTE: This recipe can be replicated using ANY Mac n cheese recipe from the 500 calorie section. I use ~150g of filling per burrito, # of burritos will vary depending on the recipe.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-45-cajun-chicken-mac-n-cheese-burrito.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,500,$r$Meat Lovers Breakfast Burrito$r$,435,44,30,17,0,6,$r$$r$,$r$6 andouille chicken sausages (these were from Target)
6 slices center cut bacon
360g egg whites
3 tspn corn starch
90g low fat cheddar Salt & pepper Spoonful of fat free Greek yogurt Hot sauce of choice
6 Tortillas) burrito tortillas (I used the new Counter Protein$r$,$r$1. In a bowl, combine egg whites, low fat cheddar, salt, pepper and corn starch. Start by adding a small amount of egg whites, then mixing in corn starch to create a "slurry", then mix in everything else to ensure it mixes smoothly. The corn starch is specifically added so that these can be frozen/reheated.
2. Steam cook the eggs. Microwave in 45 second increments. After each microwave - scrape the edges, mix thoroughly, then add back to microwave. The eggs are done cooking when they’re 80-90% firmed up - they’ll continue cooking after removing. If they’re slightly runny but seem close, let them sit for a few minutes and they will likely finish cooking with the residual heat.
3. Finely chop center cut bacon, cook over medium heat. Once close to desired crispiness level, add in chopped chicken sausage. Mix and drain excess grease.
4. Assemble burritos. Add a spoonful of greek yogurt, hot sauce, sausage/bacon, and cheesy eggs. Fold burrito, then wrap with foil or parchment paper, and store frozen
5. REHEAT INSTRUCTIONS: Microwave wrapped in a damp paper towel for 1 minute, 15 seconds (flip halfway) to defrost. Air fry at 360 for 6-7 minutes to crisp up tortilla and finish cooking interior (timing may vary based on appliance). Let sit for 5 minutes before eating.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-46-meat-lovers-breakfast-burrito.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Butter Chicken Burrito$r$,390,31,45,8,0,10,$r$$r$,$r$907g chicken breast
180g 0% greek yogurt
1 tblspn garam masala
1 tblspn Kashmiri red chili powder
1 tsp salt
3 cloves garlic minced
10 burrito tortillas
200g basmati rice Cilantro
100g Greek yogurt
40g milk
1 tspn garlic Pinch of salt
30g light butter
1 onion chopped
6 cloves garlic minced
2 tsp Ground cumin
1.5 tsp Kashmiri red chili powder
1.5 tsp Coriander
0.75 tsp Garam masala
2 cans 397g crushed tomatoes
30g cashews
80g fat free evaporated milk
0.75 tspn corn starch Add salt to taste if needed$r$,$r$1. Cut chicken breast into cubes. Combine with plain Greek yogurt, garam masala, chili powder, salt, and minced garlic. Mix well, and marinate for at least 1 hour
2. In a small bowl, mix cumin, kashmiri chili powder, coriander and garam masala
3. In a pan over high heat, cook the marinated chicken for 7-8 minutes. Remove chicken and add diced onions & light butter. Cook until softened. Add the spice blend and minced garlic, simmer for 2 minutes. Stir in crushed tomatoes, cashews, and evaporated fat-free milk. Transfer to a blender, add corn starch, and blend for 1-2 mins. Add sauce back to pan and mix with chicken
4. Mix Greek yogurt, milk, garlic, and salt to make the low calorie garlic sauce
5. Lay out the tortillas, spread low-calorie garlic yogurt sauce on each, and then add an equal amount of the butter chicken mixture to each tortilla. Fold tightly to create the burritos.
6. REHEAT INSTRUCTIONS: Microwave wrapped in a damp paper towel for 1 minute, 15 seconds (flip halfway) to defrost. Air fry at 360 for 6-7 minutes to crisp up tortilla and finish cooking interior (timing may vary based on appliance). Let sit for 5 minutes before eating.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-47-butter-chicken-burrito.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Creamy Chicken Fajita Burrito$r$,390,36,34,12,0,10,$r$$r$,$r$907g thin sliced chicken breast
0.5 bunch of cilantro, finely chopped Juice of 1 lime
1 tblspn avocado oil
1 tblspn honey
1 tblspn garlic powder
1 tsp chili powder
1 tsp paprika
1 tsp cumin
2 tsp coarse salt
0.333 cup water
4 bell peppers
1 sweet onion Salt to taste
220g 0% Greek yogurt
1 tblspn chipotle hot sauce
100g mozzarella
300g refried ranchero beans (30g per burrito)
10 burrito tortillas (I used the new Counter Protein Tortillas)$r$,$r$1. Mix 0.5 bunch finely chopped cilantro, juice of 1 lime, avocado oil, honey, garlic powder, chili powder, paprika, cumin, coarse salt, black pepper and water to a bowl and mix. Add chicken and marinate for at least 30 minutes
2. Dice bell peppers and a sweet onion, salt to taste. Add to a baking sheet, bake at 400 for 40 mins
3. Add chicken to an air fryer at 385 for 9 minutes, work in batches if needed
4. Chop cooked chicken, add roasted veggies, greek yogurt, chipotle hot sauce, mozzarella and mix
5. Grab 10 tortillas, spread 30g of refried beans on each (optional) - then evenly distribute the chicken fajita mixture across each tortilla and wrap the burrito into aluminum foil or parchment paper, then store in the freezer
6. REHEAT INSTRUCTIONS: Microwave wrapped in a damp paper towel for 1 minute, 15 seconds (flip halfway) to defrost. Air fry at 360 for 6-7 minutes to crisp up tortilla and finish cooking interior (timing may vary based on appliance). Let sit for 5 minutes before eating.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-48-creamy-chicken-fajita-burrito.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Buffalo Chicken Burrito$r$,470,32,56,12,0,10,$r$$r$,$r$680g skinless chicken thighs Season with salt, pepper, garlic, onion, smoked paprika, chili powder
10 burrito size tortillas
300g Spanish RightRice
300g plain Greek yogurt
100g 2% cheddar
100g 0.333 fat cream cheese
75g Buffalo sauce
20g honey Chopped green onions$r$,$r$1. Cook spanish RightRice according to packaging instructions, or use rice of choice
2. Season boneless, skinless chicken thighs with each seasoning listed (even amounts of each seasoning, if you prefer to measure, mix each seasoning in a small bowl in bulk then use enough to completely cover each side of the chicken). Air fry the chicken thighs for 12-15 minutes
3. In a bowl, combine Greek yogurt, light cream cheese, buffalo sauce, and honey for a touch of sweetness
4. Add the diced chicken, reduced-fat cheddar cheese, and green onions to the buffalo sauce mixture. Mix well to create the burrito filling
5. Lay out the tortillas, add three spoonfuls of the burrito filling to each tortilla, and roll tightly.
6. REHEAT INSTRUCTIONS: Microwave wrapped in a damp paper towel for 1 minute, 15 seconds (flip halfway) to defrost. Air fry at 360 for 6-7 minutes to crisp up tortilla and finish cooking interior (timing may vary based on appliance). Let sit for 5 minutes before eating.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-49-buffalo-chicken-burrito.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Creamy Chicken & Rice Burritos$r$,440,30,53,12,0,12,$r$$r$,$r$680g skinless chicken thighs Seasoned evenly with salt, garlic, onion, smoked paprika, chili powder
300g Greek yogurt
50g green enchilada sauce
200g 2% cheddar cheese Pico de Gallo:
5 Roma tomatoes , diced
1 white onion , diced
1 jalepeño pepper, diced ~0.5 cup fresh chopped cilantro Juice of 2 limes Dash of salt, pepper & garlic powder
300g Spanish RightRice
12 burrito tortillas$r$,$r$1. Season boneless, skinless chicken thighs with each seasoning listed (even amounts of each seasoning, if you prefer to measure, mix each seasoning in a small bowl in bulk then use enough to completely cover each side of the chicken). Air fry the chicken thighs for 12-15 minutes at 375
2. Dice 5 Roma tomatoes, 1 white onion, and 1 jalapeno pepper. Combine these ingredients in a bowl with a handful of chopped cilantro, juice of 2 limes, and season with salt, pepper, and garlic
3. Cook Spanish RightRice according to packaging instructions, or use rice of choice
4. Dice the chicken and mix with rice, greek yogurt, green enchilada sauce, 2% cheddar, & pico
5. Evenly distribute the mixture across 12 burrito sized tortillas, and wrap the burrito into aluminum foil or parchment paper, then store in the freezer
6. REHEAT INSTRUCTIONS: Microwave wrapped in a damp paper towel for 1 minute, 15 seconds (flip halfway) to defrost. Air fry at 360 for 6-7 minutes to crisp up tortilla and finish cooking interior (timing may vary based on appliance). Let sit for 5 minutes before eating.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-50-creamy-chicken-rice-burritos.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Green Chile Queso Burrito$r$,445,32,54,11,0,9,$r$$r$,$r$680g skinless chicken thighs Seasoned with salt, garlic, onion, chili powder
300g cottage cheese
35g white cheddar
5g roasted garlic paste
20g cheddar powder (I used the "White Cheddar" Annie's Mac n Cheese packet)
1 tablespoon jalapeño hot sauce
1, 113g container of green chiles
200g Basmati rice
9 burrito tortillas Garnish:
1, 113g can of green chiles (for garnish on each burrito) Handful chopped cilantro$r$,$r$1. Pre-heat air-fryer to 375. Tenderize/flatten chicken thighs (even out the thickness), and season (lightly coat each side with each seasoning, if you prefer you can mix them in even amounts in bulk, then add enough over chicken to completely cover both sides), add to air fryer for 12 mins.
2. Cook rice according to packaging instructions
3. Add cottage cheese, white cheddar, roasted garlic paste, cheddar powder, jalapeno hot sauce, and green chiles to a blender and blend until completely smooth.
4. Remove chicken from the air fryer, let rest for 5 mins, then dice in to small pieces. Mix chicken, green chile queso sauce, and rice until combined. Evenly distribute across 9 burrito sized tortillas, and wrap the burrito into aluminum foil or parchment paper, then store in the freezer
5. REHEAT INSTRUCTIONS: Microwave wrapped in a damp paper towel for 1 minute, 15 seconds (flip halfway) to defrost. Air fry at 360 for 6-7 minutes to crisp up tortilla and finish cooking interior (timing may vary based on appliance). Let sit for 5 minutes before eating.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-51-green-chile-queso-burrito.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,500,$r$Cheesy Egg Breakfast Burrito$r$,420,40,28,15,0,4,$r$$r$,$r$4 eggs
150g egg whites
100g blended cottage cheese
40g 2% cheddar
15g Parmigiano Reggiano
1 tspn corn starch Salt, pepper, garlic
30g fat free cheddar each
0.5 laughing cow cheese wedge each (2 total)
4 burrito tortillas (I used the new Counter Protein Tortillas)$r$,$r$1. In a bowl, combine eggs, egg whites, blended cottage cheese, low fat cheddar, parmigiano, salt, pepper, garlic and corn starch. Start by adding a small amount of egg whites, then mixing in corn starch to create a "slurry", then mix in everything else to ensure it mixes smoothly. The corn starch is specifically added so that these can be frozen/reheated.
2. Steam cook the eggs. Microwave in 45 second increments. After each microwave - scrape the edges, mix thoroughly, then add back to microwave. The eggs are done cooking when they’re 80-90% firmed up - they’ll continue cooking after removing.
3. Assemble burritos. Spread 0.5 a laughing cow cheese wedge, add fat free cheddar, and cheesy eggs. Fold burrito, then wrap with foil or parchment paper, and store frozen
4. REHEAT INSTRUCTIONS: Microwave wrapped in a damp paper towel for 1 minute, 15 seconds (flip halfway) to defrost. Air fry at 360 for 6-7 minutes to crisp up tortilla and finish cooking interior (timing may vary based on appliance). Let sit for 5 minutes before eating.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-52-cheesy-egg-breakfast-burrito.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Chicken Parm Burrito$r$,470,44,39,16,0,6,$r$$r$,$r$850g boneless skinless chicken thighs seasoned with salt, pepper, garlic, onion + juice of 1 lemon
1 tablespoon minced garlic
300g tomato sauce
60g cream cheese
90g Parmigiano Reggiano ~2 roasted red peppers Fresh basil
6 burrito tortillas$r$,$r$1. Season boneless, skinless chicken thighs with each seasoning listed (even amounts of each seasoning, if you prefer to measure, mix each seasoning in a small bowl in bulk then use enough to completely cover each side of the chicken) and the juice of 1 lemon. Let marinate for 30 minutes. Air fry the chicken thighs for 12-15 minutes at 375
2. In a pan, simmer 1 tablespoon of minced garlic for ~2 minutes, then pour over tomato sauce, cream cheese, parmigiano reggiano and diced roasted red peppers. Remove from heat once melted and combined. Dice cooked chicken, and add to the mixture. Let cool for ~10 minutes
3. Evenly distribute the mixture across 6 burrito sized tortillas, and wrap the burrito into aluminum foil or parchment paper, then store in the freezer
4. REHEAT INSTRUCTIONS: Microwave wrapped in a damp paper towel for 1 minute, 15 seconds (flip halfway) to defrost. Air fry at 360 for 6-7 minutes to crisp up tortilla and finish cooking interior (timing may vary based on appliance). Let sit for 5 minutes before eating.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-53-chicken-parm-burrito.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,600,$r$Chicken Cali Burrito$r$,510,47,48,15,0,5,$r$$r$,$r$794g skinless chicken thighs
0.5 cup orange juice
4 tblspns soy sauce Juice of 1 lime
8 cloves garlic
2 tspn cumin
1 tspn salt
1 tspn black pepper
1 tspn onion
3 dried ancho chiles
3 chipotle peppers in adobo
20g honey
1 Handful cilantro
5 burrito size tortillas of choice
160g frozen fries
75g Guac (15g each)
125g Greek yogurt (25g each)
100g fat free cheddar (20g each) Spoonful of Pico Hot sauces of choice$r$,$r$1. Combine orange juice, soy sauce, lime juice, garlic, cumin, salt, black pepper, onion, chipotle peppers, honey, and cilantro in a blender. De-stem and de-seed your ancho chiles and microwave for 60 seconds to toast, then add to blender. Blend until smooth. Marinate chicken for at least 1 hour, then air fry at 385 for 12 minutes
2. Cook store bought frozen fries in the oven according to the package instructions or until crispy
3. Lay out five burrito-sized tortillas. Add greek yogurt and guac and spread across the tortilla. Then, place an equal amount of cooked chicken and fries onto each tortilla. Top with cheddar cheese, pico, and hot sauce and wrap the burrito, and wrap with aluminum foil or parchment paper, then store in the freezer
4. REHEAT INSTRUCTIONS: Microwave wrapped in a damp paper towel for 1 minute, 15 seconds (flip halfway) to defrost. Air fry at 360 for 6-7 minutes to crisp up tortilla and finish cooking interior (timing may vary based on appliance). Let sit for 5 minutes before eating.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-54-chicken-cali-burrito.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Creamy Chicken & Cheese Burritos$r$,350,27,35,12,0,6,$r$$r$,$r$454g skinless chicken thighs
1 packet taco seasoning
200g 2% Plain Greek yogurt
80g tomato puree OR crushed tomatoes
50g pepperjack cheese
2 laughing cow cheese wedges
2 tablespoons chopped cilantro
2-3 tablespoons corn
2-3 tablespoons black beans
6 burrito tortillas$r$,$r$1. Season 454g of boneless, skinless chicken thighs a packet of taco seasoning, using only half of the packet. Cook the seasoned chicken in an air fryer at 375 for 12-15 minutes
2. In a saucepan, combine Greek yogurt, tomato puree or crushed tomatoes, laughing cow cheese wedges, beans & corn. Heat over low. Add second half of the taco seasoning packet and mix well
3. Once the chicken is cooked, chop into small pieces. Add the cooked chicken to the saucepan with the sauce and mix well. Add pepper jack cheese, mix, and transfer the mixture to a bowl.
4. To make the burrito filling easier to handle, chill it in the refrigerator for 30 to 40 minutes
5. Evenly distribute the mixture across 6 burrito sized tortillas, and wrap the burrito into aluminum foil or parchment paper, then store in the freezer
6. REHEAT INSTRUCTIONS: Microwave wrapped in a damp paper towel for 1 minute, 15 seconds (flip halfway) to defrost. Air fry at 360 for 6-7 minutes to crisp up tortilla and finish cooking interior (timing may vary based on appliance). Let sit for 5 minutes before eating.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-55-creamy-chicken-cheese-burritos.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Jalapeno Cheddar Chicken Burrito$r$,440,38,44,12,0,10,$r$$r$,$r$680g skinless chicken thighs Season with salt, pepper, garlic, onion, smoked paprika, chili powder
300g Greek yogurt
75g pickled jalapeños
30g jalapeño brine (from pickled jalapeno jar)
10g honey
80g fat free cheddar
80g 2% cheddar
300g Spanish RightRice
10 burrito tortillas (I used Counter Protein Tortillas)$r$,$r$1. Cook spanish RightRice according to packaging instructions, or use rice of choice
2. Season boneless, skinless chicken thighs with each seasoning listed (even amounts of each seasoning, if you prefer to measure, mix each seasoning in a small bowl in bulk then use enough to completely cover each side of the chicken). Air fry the chicken thighs for 12-15 minutes
3. In a blender, combine greek yogurt, pickled jalapeños, jalapeño brine, honey, a pinch of salt and blend until completely smooth
4. Dice the cooked chicken and mix with the sauce, rice, fat free and 2% cheddar
5. Lay out the tortillas, add three spoonfuls of the burrito filling to each tortilla, and roll tightly.
6. REHEAT INSTRUCTIONS: Microwave wrapped in a damp paper towel for 1 minute, 15 seconds (flip halfway) to defrost. Air fry at 360 for 6-7 minutes to crisp up tortilla and finish cooking interior (timing may vary based on appliance). Let sit for 5 minutes before eating.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-56-jalapeno-cheddar-chicken-burrito.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,500,$r$Frittata Breakfast Burrito$r$,410,32,34,16,0,6,$r$$r$,$r$6 burrito tortillas
4 slices of bacon
60g light sour cream or Greek yogurt
60g hot sauce Smoked paprika, garlic, onion Frittata
8 large eggs
100g egg whites
200g blended cottage cheese
10 slices turkey bacon, chopped
0.5 tsp salt, adjust to taste Pepper, garlic to taste
4 laughing cow cheese wedges
2 bell peppers
1 onion$r$,$r$1. Add eggs, egg whites, blended cottage cheese, chopped turkey bacon, salt + seasonings of choice, chopped bell peppers and an onion to a bowl and mix. Add to a baking sheet, add laughing cow cheese wedges (broken to small pieces) and sprinkled over the top. Add to oven at 400 for 20- 25 mins or until firm.
2. Dice up 4 slices of normal pork bacon, and cook in a pan over medium heat until crisp
3. Remove frittata from oven, let rest for 10 minutes. Slice in to 6 even pieces
4. Mix greek yogurt or sour cream, hot sauce, and a dash of smoked paprika/garlic/onion in a bowl
5. Even distribute across 6 burrito tortillas. Add sauce, 1 slice of the frittata, sprinkle over bacon, wrap the burrito into aluminum foil or parchment paper, then store in the freezer
6. REHEAT INSTRUCTIONS: Microwave wrapped in a damp paper towel for 1 minute, 15 seconds (flip halfway) to defrost. Air fry at 360 for 6-7 minutes to crisp up tortilla and finish cooking interior (timing may vary based on appliance). Let sit for 5 minutes before eating.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-57-frittata-breakfast-burrito.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Snack$r$,200,$r$Mini Creamy Beef & Cheese Burritos$r$,170,15,13,7,0,16,$r$$r$,$r$454g 93% beef
1 packet taco seasoning
150g 2% Greek yogurt
60g red enchilada sauce
80g Pico
10g nutritional yeast
100g 2% cheddar
80g fat free mozzarella
3 tablespoons chopped cilantro
16 Mission Almond Flour tortillas$r$,$r$1. Brown the beef in a skillet over medium heat, then add taco seasoning along with ~1 tablespoon of water
2. Remove pan from heat, and add in greek yogurt, red enchilada sauce, pico, nutritional yeast, 2% cheddar, fat free mozzarella, and chopped cilantro to create the burrito filling
3. Lightly moisten each tortilla with a little water on both sides in groups of four or five and microwave them for 20 seconds to make them more pliable (otherwise they may rip when rolling)
4. Add 0.062th of the filling to each tortilla and roll in to a burrito. Repeat this process 15 more times to create a total of 16 mini burritos.
5. REHEAT INSTRUCTIONS: Microwave wrapped in a damp paper towel for 2 minutes, flip halfway.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-58-mini-creamy-beef-cheese-burritos.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,600,$r$Street Taco Chicken Breakfast Burrito$r$,575,48,54,18,0,5,$r$$r$,$r$80g orange juice Juice of 2 limes
4 tblspns soy sauce
1 tblspn fresh garlic
2 tsp cumin
2 tsp onion
1 tsp paprika
2 tsp coarse salt
1 tsp black pepper
1 tblspn adobo sauce
20g brown sugar
454g skinless chicken thighs
454g diced chicken breast
1 onion
1 bunch of cilantro Add juice of 1 lime
240g diced hash browns
8 Eggs
100g Egg whites
80g sour cream
5 burrito tortillas (I use Mission tortillas)$r$,$r$1. Prepare the street taco chicken marinade and let the chicken marinate for at least 30 minutes
2. In a skillet over high heat, cook the marinated chicken, work in batches if needed. Once done, remove chicken and add chopped onion. Cook for about two minutes to slightly soften the onion. Add back chicken, stir in chopped cilantro and the juice of one lime
3. Use frozen hash brown cubes and cook in an air fryer according to the packaging instructions
4. In a separate bowl, whisk eggs, egg whites, and sour cream. Cook the mixture over low heat until the eggs are fully cooked. Season with salt, pepper, and garlic powder
5. Lay out the tortillas and evenly distribute the cooked chicken, hash browns, and egg mixture onto each one. Roll each burrito, and wrap in foil or parchment paper
6. REHEAT INSTRUCTIONS: Microwave wrapped in a damp paper towel for 1 minute, 15 seconds (flip halfway) to defrost. Air fry at 360 for 6-7 minutes to crisp up tortilla and finish cooking interior (timing may vary based on appliance). Let sit for 5 minutes before eating.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-59-street-taco-chicken-breakfast-burrito.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Snack$r$,100,$r$Street Taco Taquitos$r$,90,9,10,1,0,27,$r$$r$,$r$80g orange juice Juice of 2 limes
4 tblspns soy sauce
1 tblspn fresh garlic
2 tsp cumin
2 tsp onion
1 tsp paprika
2 tsp coarse salt
1 tsp black pepper
1 tblspn adobo sauce
20g brown sugar
454g skinless chicken thighs
454g diced chicken breast
1 onion
1 bunch of cilantro Juice of 1 lime
40g fat free cheddar
40g 2% cheddar Extra thin corn tortillas$r$,$r$1. Marinate chicken with orange juice, lime juice, soy sauce, minced garlic, cumin, onion, paprika, coarse salt, black pepper, adobo sauce & brown sugar. Marinate for 45-60 minutes. Cook in a pan over medium-high heat. Once cooked, let rest 5 minutes, then chop in to very small pieces
2. In the same pan, cook onions for 2-3 mins, then add cooked chicken back. Stir in chopped cilantro, the juice of 1 lime, fat-free and 2% cheddar cheese. Remove from heat and mix well
3. For the taquito shells, use extra thin corn tortillas. Steam the tortillas before attempting to roll them to avoid tearing (cover in moist paper towel in groups of 5-6, microwave 20-30 seconds)
4. Add 1-2 spoonful of the chicken mixture to each steamed tortilla, be careful not to overfill. Roll the tortilla tightly around the filling and place it seam-side down on a baking sheet. Repeat this process for all taquitos. Lightly spray with oil, bake at 420 degrees for ~20 minutes until crispy.
5. Store frozen. Reheat times will differ based on number of taquitos you are heating at once, but I recommend a short microwave defrost, followed by air frying to crisp up$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-60-street-taco-taquitos.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Sausage Egg and Cheese Sandwiches$r$,385,33,29,15,0,6,$r$$r$,$r$227g Turkey sausage
227g 93% beef Salt, garlic, onion, smoked paprika, black pepper, rubbed sage
200g egg whites
2 eggs
100g blended cottage cheese
5g nutritional yeast (adds cheesy flavor)
1tspn corn starch
90g light Mayo
15g Gochujang
15g sriracha Small splash of white wine vinegar Pinch of salt + pepper
6 english muffins
6 slices low fat cheese$r$,$r$1. Combine turkey sausage and lean beef (or any lean meat, or just use turkey sausage). Season with an equal amount of salt, garlic, onion, smoked paprika, black pepper and rubbed sage. Just sprinkle each over the mixture in equal amounts until the exterior is covered, then mix in to meat. If just using store bought turkey sausage, no need to season. Form in to 6 patties
2. Whisk together egg whites, eggs, blended cottage cheese, nutritional yeast and corn starch. Add to a baking sheet lined with parchment paper, and bake at 400 for 8-10 minutes
3. Over high heat, cook the sausage patties until cooked through. Top each with low-fat cheese
4. In a bowl, mix mayo, gochujang, sriracha, white wine vinegar and a pinch of salt and pepper
5. Create six sandwiches using the cooked sausage patties, sheet pan eggs, and a generous dollop of spicy mayo on each half of the muffin. Wrap in foil or parchment paper and store in freezer
6. REHEAT INSTRUCTIONS: Cover with damp paper towel - microwave for ~1 minute. Remove and split in half, microwave uncovered for 45 seconds to ensure interior is defrosted. Place the sandwich back together and air fry or bake at 375 (air fry) or 425 (oven) for 5-7 minutes.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-61-sausage-egg-and-cheese-sandwiches.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,500,$r$Ham Egg & Cheese Sandwiches$r$,405,31,27,18,0,10,$r$$r$,$r$6 whole eggs (or ~300g egg whites)
90g blended cottage cheese
30g reduced fat cheddar
5g parmigiano reggiano Salt, pepper, garlic, chopped chives
6 English muffins
12 slices Canadian bacon (2 slices each) or ham
6 slices reduced fat cheddar or American cheese
190g light Mayo
20g sriracha Squeeze of lemon juice Pinch of salt + pepper$r$,$r$1. In a bowl, combine six eggs, blended cottage cheese, cheddar cheese, parmesan, and a pinch of salt, garlic, and pepper. Mix well
2. Line a sheet pan with parchment paper, and pour the egg mixture into the pan. Top with pepper and chives, then bake at 400 for 8-10 minutes. Let rest 5-10 minutes after removing to finish
3. In a small bowl, mix light mayo, Sriracha, lemon juice, salt, and pepper until well combined
4. Once the eggs are cooked, slice them into six even squares. Spread the sauce onto each half of six English muffins. Top each with an egg square, 2 slices of canadian bacon, garlic, pepper, and a slice of reduced-fat sharp cheddar cheese
5. Wrap each sandwich in foil or parchment paper and place them in the freezer.
6. REHEAT INSTRUCTIONS: Cover with damp paper towel - microwave for ~1 minute, flip, microwave one more minute. Finish in air fryer for 4-5 mins if you want to crisp it up$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-62-ham-egg-cheese-sandwiches.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Meal Prep Frozen Cheeseburgers$r$,390,29,31,16,0,8,$r$$r$,$r$907g 93% beef
3 tspn salt
1 tspn black pepper
3 teaspoons smoked paprika
2 teaspoons onion
4 teaspoons garlic
1 tspn cumin
6 slices of reduced fat cheddar cheese
8 English muffins
175g light Mayo
175g sugar-free ketchup
80g relish
2 tspn white vinegar .75 tspn soy sauce$r$,$r$1. Form beef in to 8, 113g patties. Season equally with the seasoning blend of salt, pepper, smoked paprika, onion, garlic, and cumin. Cook on grill over medium high heat (let preheat for ~10 mins), 2.5-3 mins each side, grill closed (highly recommend using a meat thermometer to cook properly). Remove from heat and add a slice of cheese on top
2. For the burger sauce, mix mayo, sugar free ketchup, sweet relish, white vinegar and soy sauce
3. Take eight English muffins and split them in half. Evenly distribute the burger sauce onto both halves of each muffin. Place a cooked burger on top of each.
4. Wrap each assembled cheeseburger in foil and place them in the freezer.
5. REHEAT INSTRUCTIONS (for 1): Preheat oven to 450. Remove burger from foil, wrap in paper towel, microwave for 45-60 seconds, flip, microwave 45-60 seconds. Remove from paper towel, add to baking sheet (or air fryer), and bake at 450 for 5-7 minutes or until center is fully warm and the English muffin buns are crispy on the exterior$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-63-meal-prep-frozen-cheeseburgers.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,200,$r$Garlic Parmesan Chicken$r$,180,24,2,8,0,4,$r$$r$,$r$454g boneless skinless chicken thighs
10g olive oil
2 tblspn white wine vinegar
1 teaspoon garlic powder
0.5 teaspoon dried oregano
0.25 teaspoon onion powder
0.25 teaspoon crushed red pepper
0.25 teaspoon salt
0.25 teaspoon pepper
10g Honey
20g finely grated Parmesan$r$,$r$1. In a large bowl create the marinade by combining all ingredients, then add in chicken and marinate for at least 30 minutes. The longer the better
2. Toss the chicken into the air fryer (or oven) at 375 for 12 minutes or until fully cooked through$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-64-garlic-parmesan-chicken.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,200,$r$Sweet & Spicy Korean Beef$r$,195,26,9,6,0,6,$r$$r$,$r$680g 96% ground beef
2 tspn sesame oil
1.5 tablespoon cloves garlic, minced
3 green onions, only greens
30g brown sugar
80g soy sauce
20g gochujang Few dashes of red chili flakes$r$,$r$1. In a bowl, combine sesame oil, minced garlic, green onions, brown sugar, soy sauce, gochujang and red chili flakes
2. Add 96% lean beef to a pan and cook until it's about 50% done
3. Pour the prepared marinade into the pan and continue to cook the beef, simmering until it's cooked through and liquid is reduced$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-65-sweet-spicy-korean-beef.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,200,$r$Street Taco Chicken$r$,150,25,4,3,0,8,$r$$r$,$r$454g skinless chicken thighs
454g chicken breast
80g orange juice Juice of 2 limes
4 tblspns soy sauce
1 tablespoon minced garlic
2 tspn cumin
2 tspn onion
1 tspn paprika
2 tspn coarse salt
1 tspn black pepper
1 tablespoon adobo sauce
20g brown sugar$r$,$r$1. Marinate chicken with orange juice, lime juice, soy sauce, minced garlic, cumin, onion, paprika, coarse salt, black pepper, adobo sauce & brown sugar. Marinate for 45-60 minutes. Cook in a pan over medium-high heat. Once cooked, let rest 5 minutes, then chop into small pieces
2. In the same pan, cook onions for 2-3 mins, then add cooked chicken back. Stir in chopped cilantro & the juice of 1 lime$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-66-street-taco-chicken.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,100,$r$Italian Meatballs (and Marinara)$r$,55,8,1,2,0,20,$r$$r$,$r$680g 96% beef
0.25 cup Italian breadcrumbs
80g 2% milk
30g Parmigiano Reggiano
2 tsp salt
1.5 tablespoon minced garlic
1 tsp red chili flakes
2 tsp fresh chopped basil Few dashes of pepper
1 tsp soy sauce Marinara:
1 medium onion
1 stalk of celery
1 medium carrot, peeled and chopped
4 cloves minced garlic
794g can of San Marzano tomatoes
1 tablespoon Gochujang
2 tsp soy sauce Salt & pepper to taste Couple leaves of chopped fresh basil$r$,$r$1. Add finely chopped onion/celery/carrot to a non-stick large pot over medium low heat. Simmer until translucent - since I didn’t use oil, I generally will add a splash of water every few mins to deglaze/stop the veggies from sticking to the pan, then cover to steam the veggies a bit. Once softened, add minced garlic & gochujang (you can sub with tomato paste + a few dashes of red chili flakes), simmer for 1-2 mins, then add in your canned tomatoes. Add soy sauce, salt and pepper, then add to a blender and blend until completely smooth. Add in chopped basil, place on lowest heat setting, and cover while you prep meatballs.
2. In a bowl, mix Italian breadcrumbs, milk, fresh finely grated parmigiano reggiano, salt, minced garlic, red chili flakes, chopped basil, pepper, and soy sauce. Mix well, let sit for 5 minutes, then mix in 96% beef and fully combine. Form in to 20 equally sized meatballs, and bake at 400 degrees for 8 mins, remove, then add to the marinara sauce and cover with sauce completely. Cover pot and place over a low simmer for ~20 mins. Store meatballs and sauce separately$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-67-italian-meatballs-and-marinara.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,300,$r$Carne Asada$r$,225,23,4,12,0,24,$r$$r$,$r$2722g skirt steak (2722g), trim exterior fat
3 cara cara oranges (peeled, whole)
12 tblspns soy sauce Juice of 3 limes
24 cloves garlic
6 tspn cumin
3 tspn coarse salt
3 tspn black pepper
3 tspn onion
9 dried ancho chiles
6 dried guajillo chiles (optional)
1, 213g can chipotle’s in adobo
60g honey
1 entire bushel of Cilantro (include stems)
4 tablespoons avocado oil$r$,$r$1. First off - this recipe makes a massive amount of meat. I prefer to cook it in significant bulk because it is a good amount of prep work to make/long marinade time, and it is a very good group/"grill-out" recipe. If you want to start smaller, divide the recipe by 3.
2. Prep marinade. De-stem and de-seed dried ancho chiles and guajillo chiles, and microwave for ~45-60 seconds to toast (work in batches). They will "rehydrate" as they sit in the marinade.
3. Add all marinade ingredients to a blender and blend until completely smooth (~2 minutes)
4. Add to a large bowl with skirt steak, mix, add to air-tight gallon bags & marinate for 8-12 hours
5. After marinating, turn every burner on a grill to max heat. Close, and let pre heat for 15 minutes. Goal is to get the grill as hot as possible. Remove steak from marinade, and evenly distribute across grill directly over flames. I usually work in two batches. Close lid, cook for 1 minute, flip, close, cook another minute, and repeat until cooked through and nicely charred on the exterior. Since skirt steak is very thin, this should only take 5-6 minutes max. Remove, let rest for 10 minutes, slice against the grain and dice in to cubes if preferred$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-68-carne-asada.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,200,$r$Chimichurri Chicken Bites$r$,184,26,0,8,0,8,$r$$r$,$r$907g chicken breast Season lightly with salt, garlic, onion, smoked paprika
0.333 cup fresh parsley
0.333 cup fresh cilantro
4 cloves garlic
0.25 cup olive oil
0.25 cup red wine vinegar
0.25 teaspoon red chili flakes
0.75 teaspoon dried oregano
1 teaspoon coarse salt
0.5 teaspoon pepper$r$,$r$1. Use a meat tenderizer to even out the thickness of your chicken breasts. Dice in to cubes, and lightly coat the chicken with each seasoning (mix seasonings in even quantities and cover each piece of chicken). Cook chicken either in an oven (450 degrees for 15-18 minutes), air fryer (375 for 10 minutes), or pan fry
2. In a food processor, combine parsley, cilantro, and garlic until finely chopped. Alternatively, finely chop by hand
3. To the chopped herb mixture, add olive oil, red wine vinegar, red chili flakes, oregano, and salt. Mix well to create the chimichurri. Let rest for 20 minutes to let flavors combine
4. In a bowl, mix the chicken cubes with the chimichurri sauce until well coated$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-69-chimichurri-chicken-bites.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,200,$r$Chipotle-style Chicken$r$,130,22,0,5,0,8,$r$$r$,$r$907g boneless skinless chicken thighs Seasoning blend (to prepare in bulk, simply add an even amount of each seasoning in a bowl and mix): Salt, garlic, onion, smoked paprika, chili powder$r$,$r$1. Pre heat oven on broil to 475 (or "Low" setting on broil). Broiling is essentially "upside down grilling" and the heat will come directly from above, creating a similar effect as air frying. The reason for using the oven here is simply because it is more efficient given the quantity, but you could also air fry in batches.
2. Place baking sheet in oven right when you turn oven on, add light oil spray. This will preheat the sheet so the bottom will sear chicken when added
3. Season chicken thighs by sprinkling light layer of each seasoning on each side. Mix the seasoning blend in bulk if preferred. Season the chicken enough to completely cover each side.
4. Add chicken to sheet (should sizzle when placed on) - then add to oven for ~12 mins to cook
5. Let rest for 5-10 minutes, the dice in to small pieces$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-70-chipotle-style-chicken.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,200,$r$Chipotle-style Steak$r$,200,24,0,11,0,6,$r$$r$,$r$680g flank steak
20g avocado oil or olive oil Juice of 3 limes
1 tablespoon minced garlic
2 tablespoons cumin
1 tablespoon smoked paprika
2 teaspoon oregano
0.5 teaspoon chipotle chili powder
1 tablespoon Salt
2 tablespoons water Couple cracks of pepper$r$,$r$1. Combine flank steak with each of the marinade ingredients, and let marinate at least 1 hour
2. Pre heat oven on broil to 475 (or "Low" setting on broil). Broiling is essentially "upside down grilling" and the heat will come directly from above. You could also use a grill, if preferred
3. Place baking sheet in oven right when you turn oven on. This will preheat the sheet so the bottom will sear the steak when added
4. Remove sheet from oven, add a light oil spray, and place steak on sheet. Add to oven for 10-12 minutes. Adjust time based on preference - this time range should get it to medium-rare. Use a meat thermometer if you have one, pull at ~115 degree internal temp
5. Remove, place on a cutting board and let rest (covered with foil) for ~10 minutes
6. Once ready, slice in to strips against the grain, and then chop in to bite size pieces$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-71-chipotle-style-steak.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Butter Chicken$r$,305,39,14,9,0,5,$r$$r$,$r$680g chicken breast
180g 0% greek yogurt
1 tbsp garam masala
1 tbsp Kashmiri red chilli powder
1 tsp salt
3 cloves garlic, minced White Sauce:
100g Greek yogurt
50g milk
1 tspn garlic powder Pinch of salt Sauce:
30g light butter
1 onion chopped
6 cloves garlic minced
2 tsp Ground cumin
1.5 tsp Kashmiri red chilli powder
1.5 tsp Coriander
0.75 tsp Garam masala
2 cans 397g crushed tomatoes
30g cashews
80g milk Pinch of salt$r$,$r$1. Cut chicken breast into cubes. Combine with plain Greek yogurt, garam masala, chili powder, salt, and minced garlic. Mix well, and marinate for at least 1 hour
2. In a small bowl, mix cumin, kashmiri chili powder, coriander and garam masala
3. In a pan over high heat, cook the marinated chicken for 7-8 minutes. Remove chicken and add diced onions & light butter. Cook until softened. Add the spice blend and minced garlic, simmer for 2 minutes. Stir in crushed tomatoes, cashews, and milk. Transfer to a blender and blend for 1-2 mins. Add sauce back to pan and mix with chicken
4. Mix Greek yogurt, milk, garlic, and salt to make the low calorie garlic sauce, and drizzle over the top$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-72-butter-chicken.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,200,$r$Lemon Pepper Chicken$r$,145,26,0,4,0,6,$r$$r$,$r$680g chicken breast
1 lemon (juice half for marinade, add other half as topping after dicing chicken)
1 tablespoon olive oil
1 tablespoon salt
0.5 tablespoon pepper
1 tspn garlic powder$r$,$r$1. In a bowl, combine lemon juice, olive oil, salt, garlic, and pepper. Mix well
2. Place thinly sliced chicken breasts in the marinade, ensuring they are well-coated. Allow them to marinate for 30 to 45 minutes
3. Preheat a pan over medium-high heat. Add the marinated chicken breasts and sear for 2 to 3 minutes on each side, or until fully cooked
4. Remove the cooked chicken from the pan and let it rest for 5 to 10 minutes, then dice in to small pieces, juice second half of lemon over the top$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-73-lemon-pepper-chicken.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,200,$r$Cilantro Lime Chicken$r$,135,23,2,4,0,8,$r$$r$,$r$907g thin sliced chicken breast
0.5 bunch of cilantro, finely chopped Juice of 1 lime
1 tablespoon avocado oil
1 tablespoon honey
1 tablespoon garlic powder
1 teaspoon chili powder
1 teaspoon paprika
1 teaspoon cumin
2 teaspoon coarse salt Fresh black pepper to taste
0.333 cup water$r$,$r$1. In a large bowl create the marinade by combining all ingredients. Mix thinly sliced chicken breast into the marinade and let sit for at least 30 minutes
2. Toss the chicken into the air fryer (or oven) at 385 for about 9 minutes or until fully cooked through (work in two batches). Dice in to small pieces$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-74-cilantro-lime-chicken.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,200,$r$Chicken Bulgogi$r$,190,23,11,7,0,8,$r$$r$,$r$907g skinless chicken thighs Marinade:
4 tbsp gochujang
2 tbsp soy sauce
3 tbsp brown sugar
2 tbsp minced garlic
1 tsp ginger paste
1.5 tbsp mirin
1 tbsp sesame oil
0.5 tsp black pepper$r$,$r$1. Slice chicken thighs in to thin strips, 3-4 strips from each thigh
2. Make the marinade by mixing gochujang, soy sauce, brown sugar, minced garlic, ginger paste, mirin, sesame oil, and black pepper. Marinate the chicken for 4-8 hours, or overnight
3. Air fry the marinated chicken at 400 for 10 minutes or until fully cooked, work in 2-3 batches if needed. Top with sesame seeds, and enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-75-chicken-bulgogi.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,100,$r$Chipotle Chicken Meatballs$r$,45,8,2,1,0,1,$r$$r$,$r$454g ground chicken
2 chipotle peppers in adobo, finely chopped
1 tablespoon adobo sauce
2 cloves garlic, minced
0.5 small onion, grated
1 teaspoon salt
1.5 teaspoon ground cumin
1 tablespoon tomato paste
1 egg
0.25 cup plain bread crumbs$r$,$r$1. Combine all ingredients listed in a large bowl and mix until fully combined
2. Once fully combined, use a scale to measure each meatball to ~40g, which yields 15 meatballs
3. Add to a baking tray with parchment paper and bake at 475 for 15 minutes until fully cooked through
4. Store in the fridge or freezer, and reheat when ready to eat. Use in rice bowls, tacos, or sandwiches$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-76-chipotle-chicken-meatballs.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,200,$r$Grilled Buffalo Chicken Strips$r$,170,24,0,11,0,9,$r$$r$,$r$1021g Boneless skinless chicken thighs
80g Buffalo sauce
40g soy sauce Lightly coat with salt, garlic powder & paprika$r$,$r$1. Slice chicken thighs into thin even strips and season lightly with salt, garlic powder, and paprika. Use enough of each to coat the entire exterior of the chicken.
2. Marinate the chicken in a large bowl with buffalo sauce and soy sauce for at least 45 minutes up to 2 hours
3. If cooking on a grill, preheat grill on high heat for 10 mins (closed), cook chicken 2 mins on each side (close lid). If cooking in an air-fryer, preheat to 400, add strips for 10 minutes (you’ll need to work in batches)
4. Enjoy!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-77-grilled-buffalo-chicken-strips.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Snack$r$,200,$r$Italian Style Chicken Nuggets$r$,200,24,3,10,0,5,$r$$r$,$r$567g boneless skinless chicken thighs
20g olive oil
4 tblspn white wine vinegar
1 teaspoon garlic powder
1 teaspoon dried oregano
1 teaspoon dried basil
0.5 teaspoon onion powder
0.5 teaspoon crushed red pepper
0.5 teaspoon truffle salt (or normal salt)
0.5 teaspoon pepper
1 teaspoon lemon juice
20g Honey
30g grated fresh Parmesan$r$,$r$1. Dice chicken thighs (or chicken breast) into small even sized cubes
2. In a large bowl create the marinade by combining all ingredients and placing the cubed chicken into the marinade
3. Mix the chicken into the marinade and let sit for a few hours (at least 30 minutes). The longer the better
4. Toss the chicken into the air fryer (or oven) at 400 for about 9-10 minutes or until fully cooked through$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-78-italian-style-chicken-nuggets.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,200,$r$Honey Garlic Chicken$r$,155,23,7,5,0,7,$r$$r$,$r$794g chicken breast
2 tablespoons soy sauce
1 teaspoon minced garlic
1 tablespoon chili crisp
3 tablespoons honey
1 tablespoon avocado oil
0.5 tablespoon gochugaru$r$,$r$1. Dice chicken thighs (or chicken breast) into small even sized cubes
2. In a large bowl create the marinade by combining all ingredients and placing the cubed chicken into the marinade
3. Mix the chicken into the marinade and let sit for a few hours (at lease 30 minutes). The longer the better
4. Toss the chicken into the air fryer (or oven) at 385 for about 9-10 minutes or until fully cooked through$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-79-honey-garlic-chicken.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,200,$r$Halal Cart-style Chicken$r$,170,26,1,8,0,8,$r$$r$,$r$907g chicken breast
226g fat free plain Greek yogurt
40g (~3 tablespoons) olive oil
2 tablespoon shawarma seasoning or seven spice*
2 tspn smoked paprika
1 tablespoon minced garlic
2 tspn salt *if you can’t find these, add cumin, coriander and a dash of cinnamon$r$,$r$1. Dice chicken breast (or chicken thighs) into small even sized cubes
2. Create marinade by mixing greek yogurt, olive oil, shawarma seasoning, smoked paprika, minced garlic, and salt. Mix the chicken into the marinade and let sit for 4-8 hours, or overnight. The longer the better!
3. Toss the chicken into the air fryer at 400 for about 9-10 minutes or until fully cooked through. Work in two batches
4. Enjoy!!$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-80-halal-cart-style-chicken.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Counter - Taco Mac$r$,335,31,35,8,0,5,$r$$r$,$r$454g 96% beef
110g diced bell peppers
75g diced onion
30g taco seasoning (1 packet)
50g red enchilada sauce
200g pasta
180g 2% cottage cheese
20g cream cheese
16g cheddar powder
28g low fat cheddar
6.5g nutritional yeast
28g 1% milk Hot sauce to taste$r$,$r$1. Start cooking pasta according to packaging instructions, I use large elbows
2. Mix cottage cheese, cream cheese, cheddar powder, low fat cheddar (use Velveeta shreds for a more "Queso" cheese flavor), nutritional yeast, milk, and a dash of hot sauce to taste. Blend until completely smooth
3. Add diced bell peppers and onion to a pan over medium heat (I buy pre-diced, but for the sake of simplicity, you can also use 1 whole bell pepper and 0.5 an onion). Cook until softened, remove, and add your beef. Cook until browned and cooked through, then add back peppers/onions, 1 packet of taco seasoning, and red enchilada sauce. Mix to combine. Remove from heat, pour over cooked pasta, and your cheese sauce, and mix thoroughly.
4. Separate in to 5 equal servings and store frozen. To reheat, microwave 1.5 minutes, mix, then microwave 1.5-2 minutes until fully heated through$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-81-counter-taco-mac.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Counter - Beefy Queso Burritos$r$,330,31,33,9,0,8,$r$$r$,$r$454g 96% ground beef
1.5 tspn coarse salt, 1 tspn onion, 1 tspn garlic, 0.5 tspn paprika, 0.25 tspn chili powder
200g 0% greek yogurt
100g red enchilada sauce
100g Pico de gallo
60g 2% cheddar
60g fat free cheddar
60g green chiles
30g nutritional yeast
14g brown sugar
18g shiitake mushroom powder*
20g chopped cilantro
8 tortillas *I buy whole dried mushrooms, then blend to make a powder. Omit if you can't find this ingredient. It is included to add extra "Umami"$r$,$r$1. Brown ground beef in a skillet over medium heat, once mostly cooked through, add in seasoning blend and mix
2. Remove pan from heat, and mix in greek yogurt, red enchilada sauce, pico de Gallo, 2% and fat free cheddar, green chiles, nutritional yeast, brown sugar, shiitake mushroom powder, and chopped cilantro. Mix until everything is melted and combined.
3. Let mixture cool for a few minutes, then allocate equally across 8 tortillas. Roll the burritos tightly, then wrap with foil or parchment paper and store in the freezer.
4. REHEAT INSTRUCTIONS: Microwave wrapped in a damp paper towel for 1 minute, 15 seconds (flip halfway) to defrost. Air fry at 360 for 6-7 minutes to crisp up tortilla and finish cooking interior (timing may vary based on appliance). Let sit for 5 minutes before eating.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-82-counter-beefy-queso-burritos.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Main$r$,400,$r$Counter - Chicken Queso Burritos$r$,320,32,33,8,0,8,$r$$r$,$r$454g 96% ground chicken
1.5 tspn coarse salt, 1 tspn onion, 1 tspn garlic, 0.5 tspn paprika, 0.25 tspn chili powder
200g 0% greek yogurt
100g red enchilada sauce
100g Pico de gallo
60g 2% cheddar
60g fat free cheddar
60g green chiles
30g nutritional yeast
14g brown sugar
18g shiitake mushroom powder*
20g chopped cilantro
8 tortillas *I buy whole dried mushrooms, then blend to make a powder. Omit if you can't find this "Umami"$r$,$r$1. Brown ground chicken in a skillet over medium heat, once mostly cooked through, add in seasoning blend and mix
2. Remove pan from heat, and mix in greek yogurt, red enchilada sauce, pico de Gallo, 2% and fat free cheddar, green chiles, nutritional yeast, brown sugar, shiitake mushroom powder, and chopped cilantro. Mix until everything is melted and combined.
3. Let mixture cool for a few minutes, then allocate equally across 8 tortillas. Roll the burritos tightly, then wrap with foil or parchment paper and store in the freezer.
4. REHEAT INSTRUCTIONS: Microwave wrapped in a damp paper towel for 1 minute, 15 seconds (flip halfway) to defrost. Air fry at 360 for 6-7 minutes to crisp up tortilla and finish cooking interior (timing may vary based on appliance). Let sit for 5 minutes before eating.$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-83-counter-chicken-queso-burritos.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,400,$r$Counter - Breakfast Burritos$r$,335,30,34,12,0,11,$r$$r$,$r$9 andouille chicken sausage links
105g diced bell peppers
105g diced onions
270g diced potatoes (buy frozen from grocery store)
11 burrito tortillas
450g egg whites
90g blended cottage cheese
90g low fat cheddar
6 tspn corn starch Roasted Poblano Sauce*:
200g Greek yogurt
4 poblano peppers
2 jalapeño peppers
4 cloves garlic
1 tspn lime juice
1 tspn onion powder * (Full recipe makes ~475g of sauce, used 300g for 11 burritos, so there will be extra leftover)$r$,$r$1. Pre-heat oven to 450 degrees. Chop poblano peppers and jalapeno peppers in half, remove stems and seeds. Spray lightly with oil, and add to a baking sheet. Add a small amount of oil to 4 cloves of garlic, and wrap in foil. Place in the corner of the baking sheet. Bake for 40 minutes to roast.
2. Add diced bell peppers and diced onions (1 of each) to a pan over medium heat. Cook until soft. Crumble your andouille chicken sausages, and mix in the same pan. Cook frozen diced potatoes based on packaging instructions
3. In a bowl, combine egg whites, blended cottage cheese, cheddar and corn starch. Start by adding a small amount of egg whites, mix in corn starch to create a "slurry", then mix in everything else to ensure it mixes smoothly.
4. Steam cook the eggs. Microwave in 45 second increments. After each microwave - scrape the edges, mix thoroughly, then add back to microwave. The eggs are done cooking when they’re 80-90% firmed up
5. Add roasted poblanos and jalapeños to a blender with greek yogurt, lime and onion powder. Blend until smooth.
6. Mix 300g of the poblano sauce with the sausage mixture. Assemble burritos. Add eggs, potatoes, and meat/sauce mixture to each tortilla in even amounts. Fold, wrap in foil or parchment paper, and store frozen.
7. REHEAT INSTRUCTIONS: Microwave wrapped in a damp paper towel for 1 minute, 15 seconds (flip halfway) to defrost. Air fry at 360 for 6-7 minutes to crisp up tortilla and finish cooking interior$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-84-counter-breakfast-burritos.jpg$r$,$r$shared$r$);
insert into public.recipes (meal,band,name,calories,protein,carbs,fats,fibre,serves,time,ingredients,method,image_url,visibility) values ($r$Breakfast$r$,500,$r$Counter - Breakfast Bowls$r$,435,43,38,13,0,6,$r$$r$,$r$9 andouille chicken sausage links
105g diced bell peppers
105g diced onions
720g diced potatoes (buy frozen from grocery store)
750g egg whites
150g blended cottage cheese
90g low fat cheddar
6 tspn corn starch Roasted Poblano Sauce*:
200g Greek yogurt
4 poblano peppers
2 jalapeño peppers
4 cloves garlic
1 tspn lime juice
1 tspn onion powder *(Full recipe makes ~475g of sauce, used 360g for 6 bowls, so there will be extra leftover)$r$,$r$1. Pre-heat oven to 450 degrees. Chop poblano peppers and jalapeno peppers in half, remove stems and seeds. Spray lightly with oil, and add to a baking sheet. Add a small amount of oil to 4 cloves of garlic, and wrap in foil. Place in the corner of the baking sheet. Bake for 40 minutes to roast. Add diced bell peppers and diced onions (1 of each) to a pan over medium heat. Cook until soft. Crumble your andouille chicken sausages, and mix in the same pan. Cook frozen diced potatoes based on packaging instructions In a bowl, combine egg whites, blended cottage cheese, cheddar and corn starch. Start by adding a small amount of egg whites, mix in corn starch to create a "slurry", then mix in everything else to ensure it mixes smoothly. Steam cook the eggs. Microwave in 45 second increments. After each microwave - scrape the edges, mix thoroughly, then add back to microwave. The eggs are done cooking when they’re 80-90% firmed up Add roasted poblanos and jalapeños to a blender with greek yogurt, lime and onion powder. Blend until smooth. Assemble bowls. In 6 separate containers, add equal amounts of potatoes, eggs, beef and pepper mixture, and top with ~60g of sauce per bowl. There will be sauce leftover. REHEAT INSTRUCTIONS: Microwave for 1.5 minutes, give a light mix, and microwave again for 1.5-2 minutes to finish$r$,$r$https://juvofqqtvakltlwqqhkn.supabase.co/storage/v1/object/public/recipe-images/etl-book3-85-counter-breakfast-bowls.jpg$r$,$r$shared$r$);
