import tgMock from "./tg-object.mock";
const tg = window.Telegram?.WebApp ? window.Telegram.WebApp : tgMock;

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
