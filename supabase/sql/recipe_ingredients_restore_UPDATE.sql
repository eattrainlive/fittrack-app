-- Restore ingredients for 19 recipes whose OCR came back empty.
-- Updates the ingredients column only; matches by name, skips Aussie book rows.

update public.recipes set ingredients=$r$2 tsp olive oil
240g minced beef
2 tsp onion powder
2 tsp garlic powder
2 tsp ground cumin
2 tsp smoked paprika
For the salsa:
140g cherry tomatoes, finely diced
1/2 red onion, finely diced
1 avocado, chopped
4 tbsp fresh coriander, chopped
1 lemon, juiced
salt & pepper, to taste$r$ where name=$r$Mexican Beef Breakfast$r$ and image_url not like $x$%abook-%$x$;
update public.recipes set ingredients=$r$400ml coconut milk
4 tbsp natural protein powder
120g fresh or frozen mango diced
1 medium banana frozen
2 passionfruit, pulped
Large handful of ice$r$ where name=$r$Mango Passion Smoothie$r$ and image_url not like $x$%abook-%$x$;
update public.recipes set ingredients=$r$25g quinoa flakes
15g vanilla protein powder
1/2 tsp ground ginger
¼ tsp ground cinnamon
95ml milk
2 tsp maple syrup
To serve:
¼ large banana, sliced
1/2 tbsp pecans, chopped$r$ where name=$r$Gingerbread Overnight Oats$r$ and image_url not like $x$%abook-%$x$;
update public.recipes set ingredients=$r$2 slices whole grain (or gluten free if required) bread
30g soft goats cheese
2 tsp sunflower seeds
50g alfalfa sprouts
1 tbsp lemon, juiced$r$ where name=$r$Lemony Alfalfa and Goats Cheese$r$ and image_url not like $x$%abook-%$x$;
update public.recipes set ingredients=$r$120ml coconut milk
3 tbsp chia seeds
1 tsp Honey
For the berry purée:
25g blueberries
25g raspberries
25g berries, to serve$r$ where name=$r$Chia Pot with Berry Puree$r$ and image_url not like $x$%abook-%$x$;
update public.recipes set ingredients=$r$200g shredded coconut
70g almonds
2-3 tbsp honey
1 lemon, zest and juice$r$ where name=$r$Lemony Coconut Balls$r$ and image_url not like $x$%abook-%$x$;
update public.recipes set ingredients=$r$150ml condensed milk
300ml double cream
2 tbsp Matcha green tea powder
1 tsp honey$r$ where name=$r$Matcha Ice Cream$r$ and image_url not like $x$%abook-%$x$;
update public.recipes set ingredients=$r$125g cream cheese
2 tbsp caster sugar
300g self-raising flour
1/2 tsp baking powder
200g strawberries, finley sliced
2 bananas, mashed (overly ripe)
2 eggs
125g butter, melted
2 tbsp honey
125ml milk$r$ where name=$r$Strawberry Cheesecake Bread$r$ and image_url not like $x$%abook-%$x$;
update public.recipes set ingredients=$r$3 medium-large bananas
170g dark chocolate
Peanuts, chopped$r$ where name=$r$Choc Bananas$r$ and image_url not like $x$%abook-%$x$;
update public.recipes set ingredients=$r$2 tsp olive oil, divided, plus extra for drizzling
4 slices pancetta, cut into small pieces
1/2 red onion, sliced
1 large aubergine, cut into very small chunks
1 clove garlic, crushed
1 tsp cumin
1 tsp chili flakes
1 courgette, cut into very small chunks
Sea salt and black pepper to taste
4 eggs
150g feta cheese, crumbled$r$ where name=$r$Aubergine & Courgette Hash$r$ and image_url not like $x$%abook-%$x$;
update public.recipes set ingredients=$r$300 grams mackerel
100 grams jasmine rice
4 spring onions sliced
1 red pepper, deseeded and diced
For the marinade
1 tablespoon low-sodium soy sauce
juice 1 lime
2 cm piece fresh ginger, grated
1 garlic clove, crushed
2 tablespoon honey$r$ where name=$r$Grilled mackerel with soy, lime & ginger$r$ and image_url not like $x$%abook-%$x$;
update public.recipes set ingredients=$r$284ml pot buttermilk
1 egg, beaten, plus 2 poached eggs per person, to serve (optional)
200g spinach
175g buckwheat flour
1 tsp gluten-free baking powder
Pinch of paprika
Rapeseed oil, for frying$r$ where name=$r$Spinach Protein Pancakes$r$ and image_url not like $x$%abook-%$x$;
update public.recipes set ingredients=$r$2 tsp white vinegar
1 tbsp plus 1 tsp olive oil
2 medium tomatoes, quartered
Kosher salt and black pepper
455g assorted mushrooms, sliced
1 tbsp fresh thyme leaves
8 large eggs
4 slices country bread, toasted
28g parmesan, shaved
2 tbsp fresh chives, chopped$r$ where name=$r$Poached Eggs With Mushrooms and Tomatoes$r$ and image_url not like $x$%abook-%$x$;
update public.recipes set ingredients=$r$1 ripe banana
125ml sunflower oil
165ml unrefined sugar or 78ml agave
1 tsp vanilla
113g plain flour
½ tsp baking soda
¼ tsp salt
½ tsp cinnamon and nutmeg (to your taste, optional)
180g rolled oats
60g mixed nuts
35g mixed seeds
70g dried fruit$r$ where name=$r$Breakfast Cookies$r$ and image_url not like $x$%abook-%$x$;
update public.recipes set ingredients=$r$340 grams package firm or extra-firm tofu
1 teaspoon oil (or 1 tablespoon/15ml water)
3 teaspoons garlic (minced)
15 grams hummus
1 teaspoon chilli powder
1 teaspoon cumin
1 teaspoon nutritional yeast
¼ teaspoon sea salt
750 grams baby potatoes (chopped into bite-size pieces)
1 medium red bell pepper (thinly sliced)
1 tablespoon oil or water
135 grams chopped kale
3-4 large flour or gluten-free tortillas
200 grams ripe avocado (chopped or mashed)
Coriander
Chunky red or green salsa or hot sauce$r$ where name=$r$High Protein Vegan Breakfast Burrito (v)$r$ and image_url not like $x$%abook-%$x$;
update public.recipes set ingredients=$r$250 grams lean beef such as sirloin steak, trimmed of any excess fat
½ a red pepper
4 spring onions, ends trimmed
85 grams Tenderstem broccoli spears
100 gram pak choi (baby pak choi is good)
3 tablespoon fresh orange juice
1 teaspoon Chinese rice wine vinegar or white wine vinegar
2 teaspoon dark soy sauce
1 teaspoon hot chilli sauce, such as sriracha
1 medium egg white
½ teaspoon five-spice powder
1 tablespoon cornflour
1½ teaspoons self-raising flour
1 tablespoon plus a separate 1½ teaspoon rapeseed oil
2 garlic cloves, finely chopped
2 teaspoon finely chopped root ginger
¼ teaspoon chilli flakes, or a good pinch if you prefer it a bit milder$r$ where name=$r$Chinese Chilli Beef$r$ and image_url not like $x$%abook-%$x$;
update public.recipes set ingredients=$r$25g rolled oats (gluten free if required)
50g unsweetened cocoa powder
55g whey chocolate protein powder
120ml unsweetened applesauce
1 egg
1 tbsp honey
1 tsp vanilla extract
160ml almond milk, unsweetened
45g chocolate chips, plus 2 tbsp for topping
65g raspberries, broken up into large pieces$r$ where name=$r$Raspberry Chocolate Chip Protein Brownies$r$ and image_url not like $x$%abook-%$x$;
update public.recipes set ingredients=$r$3 tbsp water
1 tbsp ground flaxseed
158g organic granulated sugar, divided
105g organic brown sugar
135g creamy natural peanut butter
120g butter, softened
1 tsp vanilla extract
180g all-purpose flour
¾ tsp baking soda
½ tsp baking powder
½ tsp salt
For the ganache:
175g vegan chocolate chips
250ml coconut cream$r$ where name=$r$Vegan Peanut Butter Blossoms$r$ and image_url not like $x$%abook-%$x$;
update public.recipes set ingredients=$r$180g vegan butter, at room temperature
105g organic granulated sugar
60ml unflavored non-dairy milk
240g all-purpose flour
½ tsp salt
For the filling:
180ml lemon juice, chilled
60g cornstarch
1 can (400ml) coconut cream
150g organic granulated sugar
2 tbsp lemon zest
1 tsp lemon extract
½ tsp salt
Pinch turmeric, optional, for colour$r$ where name=$r$Vegan Lemon Bars$r$ and image_url not like $x$%abook-%$x$;
