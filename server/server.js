import { initDB } from "./config/db.js";
import app        from "./app.js";

const PORT = 3000;

await initDB();
app.listen(PORT, () => {
  console.log(`✅ Сервер: http://localhost:${PORT}`);
});
