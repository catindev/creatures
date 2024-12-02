const tg = window.Telegram.WebApp;
// import tg from "./tg-object.mock";

export function useTelegram() {
  const onClose = () => {
    tg.close();
  };

  return {
    tg,
    user: tg.initDataUnsafe?.user,
    onClose,
  };
}
