const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const productsDir = path.join(__dirname, 'src', 'data', 'products');
const outputDir = path.join(__dirname, 'public', 'data');
const outputFile = path.join(outputDir, 'products.json');

// Créer le dossier de destination
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const files = fs.readdirSync(productsDir);
const products = [];

files.forEach(file => {
  if (file.endsWith('.md')) {
    const filePath = path.join(productsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(content);
    
    // Formater les données pour correspondre à la structure du site
    const product = {
      id: data.id,
      name: data.name,
      type: data.type,
      brand: data.brand,
      price: data.price,
      description: data.description,
      image: data.image,
      efficiency: data.efficiency,
      warranty: data.warranty,
      dimensions: data.dimensions,
      weight: data.weight
    };

    // Ajouter les champs spécifiques au type
    if (data.type === 'battery') {
      product.capacity = data.capacity;
    } else {
      product.power = data.power;
    }

    // Gérer les kits
    if (data.type === 'kit') {
      product.battery = data.batteryIncluded ? `Oui (${data.batteryCapacity}Ah)` : "Non";
      product.power = data.power;
    }

    products.push(product);
  }
});

// Trier par ID
products.sort((a, b) => a.id - b.id);

// Sauvegarder dans un fichier JSON
fs.writeFileSync(outputFile, JSON.stringify(products, null, 2));
console.log(`✅ ${products.length} produits générés dans ${outputFile}`);