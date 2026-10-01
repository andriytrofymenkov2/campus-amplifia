/* Arranque del campus */
import * as S from "./core/store.js";
import { restore, me } from "./core/auth.js";
import { route, start, setShell } from "./core/router.js";
import { shell, refreshTop, toast } from "./core/ui.js";
import { loginView, registerView, recoverView, newPasswordView } from "./views/auth.js";
import { homeView } from "./views/home.js";
import { catalogView, pathsView, mineView } from "./views/catalog.js";
import { courseView } from "./views/course.js";
import { playerView } from "./views/player.js";
import { examView } from "./views/exam.js";
import { certsView, certView, verifyView } from "./views/certs.js";
import { agendaView, liveRoomView } from "./views/agenda.js";
import { profileView } from "./views/profile.js";
import { adminHome, adminCourses, adminCourseEditor, adminStudents, adminStudent, adminLive, adminReports, adminSettings } from "./views/admin.js";

async function boot() {
  await S.init();
  if (S.MODE === "supabase") (await import("./core/remote.js")).onRemoteError((msg) => toast(msg, "err"));
  restore();
  setShell(shell);

  const pub = { public: true }, guest = { public: true, guestOnly: true }, adm = { admin: true };
  route("/ingresar", loginView, guest);
  route("/registro", registerView, guest);
  route("/recuperar", recoverView, guest);
  route("/nueva-clave", newPasswordView, pub);
  route("/verificar", verifyView, pub);
  route("/verificar/:code", verifyView, pub);

  route("/inicio", homeView);
  route("/catalogo", catalogView);
  route("/rutas", pathsView);
  route("/mis-cursos", mineView);
  route("/curso/:slug", courseView);
  route("/aprender/:slug/:lid", playerView);
  route("/examen/:slug", examView);
  route("/agenda", agendaView);
  route("/vivo/:id", liveRoomView);
  route("/certificados", certsView);
  route("/certificado/:code", certView);
  route("/perfil", profileView);

  route("/admin", adminHome, adm);
  route("/admin/cursos", adminCourses, adm);
  route("/admin/cursos/:id", adminCourseEditor, adm);
  route("/admin/alumnos", adminStudents, adm);
  route("/admin/alumnos/:id", adminStudent, adm);
  route("/admin/agenda", adminLive, adm);
  route("/admin/reportes", adminReports, adm);
  route("/admin/ajustes", adminSettings, adm);

  /* La campana del encabezado se actualiza sola cuando llega una notificación */
  let unread = -1;
  S.onChange(() => {
    const u = me();
    if (!u) return;
    const n = S.notifsOf(u.id).filter((x) => !x.read).length;
    if (n !== unread) { unread = n; refreshTop(); }
  });

  start();
  document.getElementById("boot")?.remove();
}

boot().catch((err) => {
  console.error(err);
  document.getElementById("app").innerHTML = `<div class="empty" style="margin:40px auto;max-width:520px"><h3>No pudimos abrir el campus</h3><p>Recargá la página. Si el problema sigue, escribinos a grupoamplifia@gmail.com.</p></div>`;
  document.getElementById("boot")?.remove();
});
