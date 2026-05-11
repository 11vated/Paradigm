/**
 * Food Generator V3 — Recipe Generation with Nutrition
 * Features: Multi-course meals, nutrition info, ingredient lists
 * Export: JSON recipes, HTML menu, shopping list
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';

interface FoodParams {
  cuisine: string;
  courses: number;
  difficulty: 'easy' | 'medium' | 'hard';
  diet: 'omnivore' | 'vegetarian' | 'vegan' | 'keto' | 'paleo';
  servings: number;
  timeLimit: number;
}

interface Recipe {
  name: string;
  course: string;
  ingredients: { name: string; amount: number; unit: string }[];
  instructions: string[];
  nutrition: { calories: number; protein: number; carbs: number; fat: number };
  time: number;
}

export async function generateFoodV3(
  seed: Seed,
  outputPath: string
): Promise<{
  jsonPath: string;
  htmlPath: string;
  shoppingListPath: string;
  recipeCount: number;
  totalCalories: number;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'food-default');
  const params = extractFoodParams(seed, rng);
  
  // Generate recipes
  const recipes = generateRecipes(params, rng);
  
  // Generate shopping list
  const shoppingList = generateShoppingList(recipes);
  
  // Export
  const jsonPath = await exportFoodJSON({ params, recipes, shoppingList }, outputPath, seed);
  const htmlPath = await exportFoodHTML(recipes, outputPath, seed);
  const shoppingListPath = await exportShoppingList(shoppingList, outputPath, seed);
  
  const totalCalories = recipes.reduce((sum, r) => sum + r.nutrition.calories, 0);
  
  return {
    jsonPath,
    htmlPath,
    shoppingListPath,
    recipeCount: recipes.length,
    totalCalories
  };
}

function extractFoodParams(seed: Seed, rng: Xoshiro256StarStar): FoodParams {
  const cuisines = ['Italian', 'Chinese', 'Japanese', 'Mexican', 'Indian', 'French', 'Thai', 'American'];
  const diets = ['omnivore', 'vegetarian', 'vegan', 'keto', 'paleo'] as const;
  const difficulties = ['easy', 'medium', 'hard'] as const;
  
  return {
    cuisine: cuisines[Math.floor(rng.nextF64() * cuisines.length)],
    courses: 1 + Math.floor(rng.nextF64() * 4),
    difficulty: difficulties[Math.floor(rng.nextF64() * difficulties.length)],
    diet: diets[Math.floor(rng.nextF64() * diets.length)],
    servings: 2 + Math.floor(rng.nextF64() * 6),
    timeLimit: 15 + Math.floor(rng.nextF64() * 105)
  };
}

function generateRecipes(params: FoodParams, rng: Xoshiro256StarStar): Recipe[] {
  const recipes: Recipe[] = [];
  const courses = ['appetizer', 'main', 'side', 'dessert', 'soup', 'salad'];
  
  const ingredientsDb: Record<string, string[]> = {
    Italian: ['pasta', 'tomato', 'basil', 'mozzarella', 'olive oil', 'garlic', 'parmesan'],
    Chinese: ['rice', 'soy sauce', 'ginger', 'garlic', 'tofu', 'vegetables', 'sesame'],
    Japanese: ['rice', 'fish', 'seaweed', 'soy sauce', 'wasabi', 'tempura', 'miso'],
    Mexican: ['tortilla', 'beans', 'rice', 'cheese', 'salsa', 'avocado', 'cilantro'],
    Indian: ['rice', 'curry', 'spices', 'lentils', 'yogurt', 'naan', 'garam masala'],
    French: ['butter', 'cream', 'wine', 'herbs', 'cheese', 'bread', 'stock'],
    Thai: ['rice', 'coconut', 'curry', 'fish sauce', 'lime', 'chili', 'lemongrass'],
    American: ['beef', 'potato', 'corn', 'cheese', 'bread', 'bacon', 'bbq sauce']
  };
  
  const proteinDb: Record<string, string[]> = {
    omnivore: ['chicken', 'beef', 'pork', 'fish', 'shrimp'],
    vegetarian: ['tofu', 'tempeh', 'eggs', 'cheese', 'legumes'],
    vegan: ['tofu', 'tempeh', 'seitan', 'legumes', 'nuts'],
    keto: ['bacon', 'eggs', 'cheese', 'salmon', 'avocado'],
    paleo: ['chicken', 'beef', 'fish', 'eggs', 'nuts']
  };
  
  for (let c = 0; c < params.courses; c++) {
    const course = courses[c % courses.length];
    const baseIngredients = ingredientsDb[params.cuisine] || ingredientsDb.Italian;
    const proteins = proteinDb[params.diet];
    
    const recipeIngredients = [];
    const numIngredients = 4 + Math.floor(rng.nextF64() * 6);
    
    for (let i = 0; i < numIngredients; i++) {
      const list = i === 0 ? proteins : baseIngredients;
      const ingredient = list[Math.floor(rng.nextF64() * list.length)];
      recipeIngredients.push({
        name: ingredient,
        amount: 100 + Math.floor(rng.nextF64() * 400),
        unit: ['g', 'ml', 'cups', 'tbsp', 'pieces'][Math.floor(rng.nextF64() * 5)]
      });
    }
    
    recipes.push({
      name: `${params.cuisine} ${course} ${Math.floor(rng.nextF64() * 100)}`,
      course,
      ingredients: recipeIngredients,
      instructions: [
        'Prepare all ingredients',
        'Follow cooking steps based on dish type',
        'Season to taste',
        'Serve hot and enjoy!'
      ],
      nutrition: {
        calories: 200 + Math.floor(rng.nextF64() * 600),
        protein: 10 + Math.floor(rng.nextF64() * 40),
        carbs: 20 + Math.floor(rng.nextF64() * 60),
        fat: 5 + Math.floor(rng.nextF64() * 30)
      },
      time: 10 + Math.floor(rng.nextF64() * 50)
    });
  }
  
  return recipes;
}

function generateShoppingList(recipes: Recipe[]): Record<string, { amount: number; unit: string }[]> {
  const list: Record<string, { amount: number; unit: string }[]> = {};
  
  recipes.forEach(recipe => {
    recipe.ingredients.forEach(ing => {
      if (!list[ing.name]) list[ing.name] = [];
      list[ing.name].push({ amount: ing.amount, unit: ing.unit });
    });
  });
  
  return list;
}

async function exportFoodJSON(data: any, outputPath: string, seed: Seed): Promise<string> {
  const filename = `food_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(outputPath, filename);
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

async function exportFoodHTML(recipes: Recipe[], outputPath: string, seed: Seed): Promise<string> {
  const filename = `food_${seed.$hash || 'unknown'}.html`;
  const filePath = path.join(outputPath, filename);
  
  const html = `<!DOCTYPE html><html><head><title>Recipes - ${seed.$hash}</title>
<style>body{font-family:system-ui;padding:20px;max-width:800px;margin:0 auto}
.recipe{background:#f5f5f5;padding:20px;margin:16px 0;border-radius:8px}
.ingredients li{margin:4px 0}</style></head><body><h1>Generated Recipes</h1>
${recipes.map(r => `<div class="recipe"><h2>${r.name} (${r.course})</h2>
<p><strong>Time:</strong> ${r.time} min | <strong>Calories:</strong> ${r.nutrition.calories}</p>
<h3>Ingredients</h3><ul class="ingredients">${r.ingredients.map(i => `<li>${i.amount} ${i.unit} ${i.name}</li>`).join('')}</ul>
<h3>Instructions</h3><ol>${r.instructions.map(s => `<li>${s}</li>`).join('')}</ol></div>`).join('')}
</body></html>`;
  
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, html);
  return filePath;
}

async function exportShoppingList(list: Record<string, { amount: number; unit: string }[]>, outputPath: string, seed: Seed): Promise<string> {
  const filename = `shopping_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(outputPath, filename);
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
  return filePath;
}
