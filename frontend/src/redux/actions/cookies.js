import utils from "../utils";

export const showCookieBanner = () => ({
  type: utils.action_types.SHOW_COOKIE_BANNER,
});

export const hideCookieBanner = () => ({
  type: utils.action_types.HIDE_COOKIE_BANNER,
});
