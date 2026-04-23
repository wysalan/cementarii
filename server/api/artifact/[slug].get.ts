import { prisma } from "../../utils/prisma";

export default defineCachedEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug");
  const data = await prisma.artifact.findFirst({ where: { slug: slug } });
  return data;
});
