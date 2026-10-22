import { presentFacility, presentShopPlace, type Places, type ShopPlace } from "@neighbourly/shared";
import { http } from "msw";
import { fileUrl, requireUser, route } from "../context";
import { db } from "../db";
import { expireStale } from "./ecofood";

export const placesHandlers = [
  // Every bookable facility and verified shop with a map pin. Public business details only.
  http.get(
    "/api/places",
    route(({ request }): Places => {
      requireUser(request);
      expireStale();
      const shops = db.users
        .map((u) => presentShopPlace(u, db.food.filter((f) => f.ownerId === u.id && f.status === "available").length))
        .filter((s): s is ShopPlace => s !== null)
        .sort((a, b) => a.shopName.localeCompare(b.shopName));
      return {
        facilities: db.facilities.filter((f) => f.active).map((f) => presentFacility(f, { fileUrl })),
        shops,
      };
    }),
  ),
];
