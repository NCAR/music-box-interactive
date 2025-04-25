import utils from "../utils";

const initialState = {
  cookieBannerVisible: true,
};

export const cookiesReducer = (state = initialState, action) => {
  switch (action.type) {
    case utils.action_types.SHOW_COOKIE_BANNER:
      return {
        ...state,
        cookieBannerVisible: true,
      };
    case utils.action_types.HIDE_COOKIE_BANNER:
      return {
        ...state,
        cookieBannerVisible: false,
      };
    default:
      return state;
  }
};
