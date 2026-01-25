// 关键词词库配置文件
// 分为游戏、嘉宾、其他三类
const keywordLibrary = {
    '游戏': [
        '原神', '崩坏3', '星穹铁道', '王者荣耀', '英雄联盟','lol',
        'CS2', 'DOTA2', '永劫无间', 'APEX', 'PUBG',
        'Minecraft', '塞尔达传说', '动物森友会', '喷射战士', '马里奥',
        '巫师3', '赛博朋克2077', '艾尔登法环', '黑暗之魂', '只狼'
    ],
    '嘉宾': [
        'Geebar', 'Lee唉咯', '樱井飞鸟', '残杀Top丶KILL', '米卡丘mica',
        '快乐滋崩在这里', '周九', '吴十', '郑十一', '王十二',
        '李十三', '张十四', '赵十五', '钱十六', '孙十七'
    ],
    '其他': [
        '录播', '直播', '剪辑', '合集', '精华',
        '搞笑', '精彩', '高能', '集锦', '全程'
    ]
};

// 构建关键词到分类的映射，用于快速查找
const keywordToCategory = {};
for (const [category, keywords] of Object.entries(keywordLibrary)) {
    keywords.forEach(keyword => {
        keywordToCategory[keyword] = category;
    });
}

// 所有关键词列表（用于快速搜索）
let allKeywords = [];
// 初始化所有关键词列表
for (const category in keywordLibrary) {
    allKeywords = allKeywords.concat(keywordLibrary[category]);
}
// 去重
allKeywords = [...new Set(allKeywords)];
