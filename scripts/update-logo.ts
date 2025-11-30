import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateLogo() {
  try {
    // 查找 homePage 的 ContentBlock
    const homePageBlock = await prisma.contentBlock.findUnique({
      where: { key: "homePage" },
    });

    if (!homePageBlock) {
      console.log("未找到 homePage 資料，跳過更新");
      return;
    }

    const payload = homePageBlock.payload as any;

    // 更新 header logo
    if (payload[0] && payload[0].header && payload[0].header.logo) {
      payload[0].header.logo.icon = "/logo.png";
      payload[0].header.logo.text = "佑羲人力";
      console.log("已更新 header logo");
    }

    // 更新 footer logo
    if (payload[0] && payload[0].footer && payload[0].footer.logo) {
      payload[0].footer.logo.icon = "/logo.png";
      payload[0].footer.logo.text = "佑羲人力";
      console.log("已更新 footer logo");
    }

    // 保存更新
    await prisma.contentBlock.update({
      where: { key: "homePage" },
      data: { payload },
    });

    console.log("✅ Logo 更新成功！");
  } catch (error) {
    console.error("❌ 更新失敗：", error);
  } finally {
    await prisma.$disconnect();
  }
}

updateLogo();
