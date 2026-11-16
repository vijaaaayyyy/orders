export const MENU = [
  { name: "Veg Thali", station: "Hot line" },
  { name: "Special Thali", station: "Hot line" },
  { name: "Paneer Roll", station: "Grill" },
  { name: "Maggi", station: "Snack" },
  { name: "Masala Dosa", station: "Tawa" },
  { name: "Veg Biryani", station: "Rice" },
  { name: "Fried Rice", station: "Wok" },
  { name: "Chole Bhature", station: "Hot line" },
  { name: "Grilled Sandwich", station: "Snack" },
  { name: "Cold Coffee", station: "Beverages" },
  { name: "Masala Chai", station: "Beverages" },
  { name: "Fruit Juice", station: "Beverages" },
] as const;

export const MENU_NAMES = new Set<string>(MENU.map((item) => item.name));
