

// 从API获取关键词库
let keywordLibrary = {};
let keywordToCategory = {};
let allKeywords = [];

// 从API获取关键词库
async function loadKeywordsFromAPI() {
    try {
        const response = await fetch(window.API_BASE_URL + 'keywords');
        const data = await response.json();
        
        // 构建关键词库
        keywordLibrary = {};
        keywordToCategory = {};
        allKeywords = [];
        
        // 构建同义词映射
        const synonymToMain = {};
        
        data.keywords.forEach(item => {
            const category = item.category;
            const keyword = item.keyword;
            const mainKeyword = item.main_keyword;
            
            // 构建同义词到主关键词的映射
            if (mainKeyword && mainKeyword !== keyword) {
                synonymToMain[keyword] = mainKeyword;
            }
            
            if (!keywordLibrary[category]) {
                keywordLibrary[category] = [];
            }
            keywordLibrary[category].push(keyword);
            keywordToCategory[keyword] = category;
            allKeywords.push(keyword);
        });
        
        // 将同义词映射存储在全局变量中
        window.synonymToMain = synonymToMain;
        
        console.log('关键词库加载成功，共', allKeywords.length, '个关键词');
    } catch (error) {
        console.error('加载关键词库失败:', error);
    }
}

// 管理员模式状态
let isAdminMode = localStorage.getItem('admin_token') !== null;

// 更新管理员模式指示器
function updateAdminIndicator() {
    let indicator = document.getElementById('adminIndicator');
    if (isAdminMode) {
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'adminIndicator';
            indicator.style.cssText = 'position: fixed; top: 10px; right: 10px; background-color: #fd2d5c; color: white; padding: 10px 20px; border-radius: 5px; font-weight: bold; z-index: 9999; font-family: Pixel, monospace; display: flex; align-items: center; gap: 10px;';
            indicator.innerHTML = `
                <span style="margin-right: 5px;">管理员模式</span>
                <button id="homeBtn" style="background-color: white; color: #fd2d5c; border: none; padding: 5px 10px; cursor: pointer; font-family: Pixel, monospace; font-weight: bold; border-radius: 3px;">返回主页</button>
                <button id="addVideoBtn" style="background-color: white; color: #fd2d5c; border: none; padding: 5px 10px; cursor: pointer; font-family: Pixel, monospace; font-weight: bold; border-radius: 3px;">添加视频</button>
                <button id="keywordAdminBtn" style="background-color: white; color: #fd2d5c; border: none; padding: 5px 10px; cursor: pointer; font-family: Pixel, monospace; font-weight: bold; border-radius: 3px;">关键词管理</button>
                <button id="exitAdminBtn" style="background-color: rgba(0, 0, 0, 0.3); color: white; border: none; padding: 5px 10px; cursor: pointer; font-family: Pixel, monospace; font-weight: bold; border-radius: 3px; margin-left: 10px;">退出</button>
            `;
            document.body.appendChild(indicator);
            
            document.getElementById('homeBtn').onclick = (e) => {
                e.stopPropagation();
                window.location.href = 'index';
            };
            
            document.getElementById('addVideoBtn').onclick = (e) => {
                e.stopPropagation();
                window.location.href = 'add-video';
            };
            
            document.getElementById('keywordAdminBtn').onclick = (e) => {
                e.stopPropagation();
                window.location.href = 'keyword-admin';
            };
            
            document.getElementById('exitAdminBtn').onclick = () => {
                isAdminMode = false;
                localStorage.removeItem('admin_token');
                alert('已退出管理员模式');
                updateAdminIndicator();
                location.reload();
            };
        }
    } else {
        if (indicator) {
            indicator.remove();
        }
    }
}

// 当前视频信息
let currentVideo = null;
// 当前关键词列表
let currentKeywords = [];
// 是否是编辑模式
let isEditMode = false;
// 原始视频数据（用于编辑模式比较）
let originalVideoData = null;

// DOM元素
const videoInfoTextarea = document.getElementById('videoInfo');
const parseVideoBtn = document.getElementById('parseVideoBtn');
const videoKeywordsTextarea = document.getElementById('videoKeywords');
const parseKeywordsBtn = document.getElementById('parseKeywordsBtn');
const keywordsEditor = document.getElementById('keywordsEditor');
const keywordsList = document.getElementById('keywordsList');
const newKeywordInput = document.getElementById('newKeywordInput');
const newKeywordCategory = document.getElementById('newKeywordCategory');
const addKeywordBtn = document.getElementById('addKeywordBtn');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');

// 表单输入元素
const bvidInput = document.getElementById('bvidInput');
const titleInput = document.getElementById('titleInput');
const authorInput = document.getElementById('authorInput');
const picInput = document.getElementById('picInput');
const descriptionInput = document.getElementById('descriptionInput');
const lengthInput = document.getElementById('lengthInput');
const createdInput = document.getElementById('createdInput');

// 获取URL参数
function getUrlParam(name) {
    const reg = new RegExp(`(^|&)${name}=([^&]*)(&|$)`);
    const r = window.location.search.substr(1).match(reg);
    if (r != null) return decodeURIComponent(r[2]);
    return null;
}

// 根据分类获取颜色
function getColorByCategory(category) {
    const categoryColors = {
        '嘉宾': '#e74c3c',
        '游戏': '#9b7707',
        '其他': '#2c3e50'
    };
    return categoryColors[category] || '#7f8c8d';
}

// 从JSON解析视频信息并填充表单
function parseVideoInfo() {
    const content = videoInfoTextarea.value.trim();
    if (!content) {
        alert('请输入视频信息');
        return;
    }

    try {
        let videoData;
        
        // 首先尝试解析为标准JSON
        try {
            videoData = JSON.parse(content);
            console.log('JSON解析成功:', videoData);
        } catch (jsonError) {
            console.log('JSON解析失败，尝试正则提取:', jsonError);
            
            // JSON解析失败，尝试正则提取
            videoData = {};
            const bvidMatch = content.match(/bvid\s*[:：]\s*[`"']?([^`"']+)[`"']?/i);
            const titleMatch = content.match(/title\s*[:：]\s*[`"']?([^`"']+)[`"']?/i);
            const authorMatch = content.match(/author\s*[:：]\s*[`"']?([^`"']+)[`"']?/i);
            const picMatch = content.match(/pic\s*[:：]\s*[`"']?([^`"']+)[`"']?/i);
            const descMatch = content.match(/description\s*[:：]\s*[`"']?([^`"']+)[`"']?/i);
            const lengthMatch = content.match(/length\s*[:：]\s*[`"']?([^`"']+)[`"']?/i);
            
            if (bvidMatch) videoData.bvid = bvidMatch[1].trim();
            if (titleMatch) videoData.title = titleMatch[1].trim();
            if (authorMatch) videoData.author = authorMatch[1].trim();
            if (picMatch) videoData.pic = picMatch[1].trim();
            if (descMatch) videoData.description = descMatch[1].trim();
            if (lengthMatch) videoData.length = lengthMatch[1].trim();
            // 尝试匹配created字段
            const createdMatch = content.match(/created\s*[:：]\s*[`"']?([^`"']+)[`"']?/i);
            if (createdMatch) videoData.created = createdMatch[1].trim();
        }
        
        // 检查是否有嵌套的data字段
        if (videoData.data && typeof videoData.data === 'object') {
            videoData = videoData.data;
        }
        
        // 检查是否是数组
        if (Array.isArray(videoData)) {
            videoData = videoData[0];
        }
        
        // 检查是否有嵌套的vlist字段
        if (videoData.vlist && Array.isArray(videoData.vlist)) {
            videoData = videoData.vlist[0];
        }
        
        if (videoData.bvid && videoData.title && videoData.author) {
            bvidInput.value = videoData.bvid || '';
            titleInput.value = videoData.title || '';
            authorInput.value = videoData.author || '';
            picInput.value = videoData.pic || '';
            descriptionInput.value = videoData.description || '';
            lengthInput.value = videoData.length || '';
            
            // 处理发布时间，将时间戳转换为datetime-local格式
            if (videoData.created) {
                let createdDate;
                if (typeof videoData.created === 'number') {
                    // 如果是时间戳
                    createdDate = new Date(videoData.created * 1000);
                } else if (typeof videoData.created === 'string') {
                    // 如果是字符串，尝试转换为日期
                    createdDate = new Date(videoData.created);
                } else {
                    createdDate = null;
                }
                
                if (createdDate && !isNaN(createdDate.getTime())) {
                    // 转换为datetime-local格式 (YYYY-MM-DDTHH:MM)
                    const year = createdDate.getFullYear();
                    const month = String(createdDate.getMonth() + 1).padStart(2, '0');
                    const day = String(createdDate.getDate()).padStart(2, '0');
                    const hours = String(createdDate.getHours()).padStart(2, '0');
                    const minutes = String(createdDate.getMinutes()).padStart(2, '0');
                    createdInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
                }
            }
            
            currentVideo = {
                bvid: videoData.bvid,
                title: videoData.title,
                author: videoData.author,
                pic: videoData.pic,
                description: videoData.description,
                length: videoData.length,
                created: videoData.created
            };
            
            alert('视频信息解析成功');
        } else {
            console.log('解析结果:', videoData);
            alert('未找到必需字段，需要包含bvid、title、author');
        }
    } catch (error) {
        console.error('解析视频信息失败:', error);
        alert('解析视频信息失败，请检查格式');
    }
}

// 解析关键词
async function parseKeywords() {
    const content = videoKeywordsTextarea.value.trim();
    if (!content) {
        alert('请输入关键词信息');
        return;
    }

    try {
        // 确保关键词库已加载
        if (Object.keys(keywordToCategory).length === 0) {
            await loadKeywordsFromAPI();
        }
        
        // 合并前端词库和后端关键词（如果有）
        const allKeywordsMap = { ...keywordToCategory };
        const allKeywordsList = Object.keys(allKeywordsMap);
        
        // 按关键词长度排序（优先匹配更长的关键词，避免短关键词匹配长关键词）
        allKeywordsList.sort((a, b) => b.length - a.length);
        
        const matchedKeywords = new Set();
        
        // 获取同义词到主关键词的映射
        const synonymToMain = window.synonymToMain || {};
        
        // 遍历所有关键词，检查是否在内容中出现
        allKeywordsList.forEach(keyword => {
            if (content.includes(keyword)) {
                matchedKeywords.add(keyword);
                
                // 如果是同义词，将其主关键词也添加进去
                if (synonymToMain[keyword]) {
                    const mainKeyword = synonymToMain[keyword];
                    matchedKeywords.add(mainKeyword);
                }
            }
        });
        
        // 构建关键词列表
        const keywords = [];
        matchedKeywords.forEach(keyword => {
            const category = allKeywordsMap[keyword] || '其他';
            keywords.push({ keyword, category });
        });
        
        // 按分类排序
        keywords.sort((a, b) => {
            const categoryOrder = { '嘉宾': 0, '游戏': 1, '其他': 2 };
            return (categoryOrder[a.category] || 2) - (categoryOrder[b.category] || 2);
        });
        
        currentKeywords = keywords;
        renderKeywords();
        alert(`解析出${keywords.length}个关键词`);
    } catch (error) {
        console.error('解析关键词失败:', error);
        alert('解析关键词失败，请检查格式');
    }
}

// 渲染关键词列表
function renderKeywords() {
    keywordsList.innerHTML = currentKeywords.map((item, index) => {
        const bgColor = getColorByCategory(item.category);
        return `
            <div class="keyword-tag" data-index="${index}" style="background-color: ${bgColor}; color: white; padding: 6px 12px; border: none; font-size: 14px; cursor: pointer; margin-right: 8px; margin-bottom: 8px; display: inline-flex; align-items: center; gap: 6px; font-family: 'Pixel', monospace;">
                <span>${item.keyword}</span>
                <span class="delete-keyword-btn" data-index="${index}" style="display: ${isAdminMode ? 'inline-block' : 'none'}; margin-left: 4px; cursor: pointer; font-size: 16px; font-weight: bold;">×</span>
            </div>
        `;
    }).join('');
}

// 添加关键词
function addKeyword() {
    const keyword = newKeywordInput.value.trim();
    const category = newKeywordCategory.value;

    if (!keyword) {
        alert('请输入关键词');
        return;
    }

    if (currentKeywords.some(item => item.keyword === keyword)) {
        alert('关键词已存在');
        return;
    }

    currentKeywords.push({ keyword, category });
    renderKeywords();
    newKeywordInput.value = '';
}

// 删除关键词
function deleteKeyword(index) {
    if (!isAdminMode) {
        alert('需要管理员模式才能删除关键词');
        return;
    }

    // 直接删除，不显示确认弹窗
    currentKeywords.splice(index, 1);
    renderKeywords();
}

// 保存视频
async function saveVideo() {
    const bvid = bvidInput.value.trim();
    
    if (!bvid) {
        alert('请填写BV号');
        return;
    }

    if (currentKeywords.length === 0) {
        alert('请至少添加一个关键词');
        return;
    }

    try {
        const keywords = currentKeywords.map(item => item.keyword).join(' ');
        const keywordCategories = {};
        currentKeywords.forEach(item => {
            keywordCategories[item.keyword] = item.category;
        });

        // 处理发布时间，将datetime-local格式转换为字符串格式
        let created = null;
        if (createdInput.value) {
            const createdDate = new Date(createdInput.value);
            if (!isNaN(createdDate.getTime())) {
                // 转换为字符串格式：YYYY-MM-DD HH:MM:SS
                const year = createdDate.getFullYear();
                const month = String(createdDate.getMonth() + 1).padStart(2, '0');
                const day = String(createdDate.getDate()).padStart(2, '0');
                const hours = String(createdDate.getHours()).padStart(2, '0');
                const minutes = String(createdDate.getMinutes()).padStart(2, '0');
                const seconds = String(createdDate.getSeconds()).padStart(2, '0');
                created = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            }
        }
        
        const videoData = {
            bvid,
            title: titleInput.value.trim(),
            author: authorInput.value.trim(),
            pic: picInput.value.trim(),
            description: descriptionInput.value.trim(),
            length: lengthInput.value.trim(),
            created,
            keywords,
            keyword_categories: JSON.stringify(keywordCategories)
        };

        const url = isEditMode ? `${window.API_BASE_URL}/videos/${bvid}` : `${window.API_BASE_URL}/videos`;
        const method = isEditMode ? 'PUT' : 'POST';

        let requestBody = {};
        
        if (isEditMode) {
            // 编辑模式：只发送有变化的字段
            if (titleInput.value.trim() !== originalVideoData.title) {
                requestBody.title = titleInput.value.trim();
            }
            if (authorInput.value.trim() !== originalVideoData.author) {
                requestBody.author = authorInput.value.trim();
            }
            if (picInput.value.trim() !== originalVideoData.pic) {
                requestBody.pic = picInput.value.trim();
            }
            if (descriptionInput.value.trim() !== originalVideoData.description) {
                requestBody.description = descriptionInput.value.trim();
            }
            if (lengthInput.value.trim() !== originalVideoData.length) {
                requestBody.length = lengthInput.value.trim();
            }
            if (created !== null) {
                // 直接比较字符串格式
                if (created !== originalVideoData.created) {
                    requestBody.created = created;
                }
            }
            
            // 关键词总是发送
            requestBody.keywords = keywords;
            requestBody.keyword_categories = JSON.stringify(keywordCategories);
            requestBody.token = localStorage.getItem('admin_token');
        } else {
            // 添加模式：需要完整的视频信息
            requestBody = {
                bvid,
                title: titleInput.value.trim(),
                author: authorInput.value.trim(),
                pic: picInput.value.trim(),
                description: descriptionInput.value.trim(),
                length: lengthInput.value.trim(),
                created,
                keywords,
                keyword_categories: JSON.stringify(keywordCategories)
            };
        }

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            alert(isEditMode ? '视频更新成功' : '视频保存成功');
            window.location.href = 'index';
        } else {
            const error = await response.json();
            alert(`保存失败: ${error.detail || '未知错误'}`);
        }
    } catch (error) {
        console.error('保存视频失败:', error);
        alert('保存视频时发生网络错误，请稍后重试');
    }
}

// 加载视频信息（编辑模式）
async function loadVideoInfo(bvid) {
    try {
        const response = await fetch(`${window.API_BASE_URL}/videos/${bvid}`);
        if (!response.ok) {
            throw new Error('视频不存在');
        }
        
        const video = await response.json();
        
        bvidInput.value = video.bvid || '';
        titleInput.value = video.title || '';
        authorInput.value = video.author || '';
        picInput.value = video.pic || '';
        descriptionInput.value = video.description || '';
        lengthInput.value = video.length || '';
        
        // 处理发布时间，将时间戳或字符串转换为datetime-local格式
        if (video.created) {
            let createdDate;
            if (typeof video.created === 'number') {
                // 如果是时间戳
                createdDate = new Date(video.created * 1000);
            } else if (typeof video.created === 'string') {
                // 如果是字符串，尝试解析
                // 支持格式：'2025-12-21 02:40:58'
                const parts = video.created.split(' ');
                if (parts.length === 2) {
                    const datePart = parts[0]; // '2025-12-21'
                    const timePart = parts[1]; // '02:40:58'
                    createdDate = new Date(`${datePart}T${timePart}`);
                } else {
                    createdDate = new Date(video.created);
                }
            } else {
                createdDate = null;
            }
            
            if (createdDate && !isNaN(createdDate.getTime())) {
                // 转换为datetime-local格式 (YYYY-MM-DDTHH:MM)
                const year = createdDate.getFullYear();
                const month = String(createdDate.getMonth() + 1).padStart(2, '0');
                const day = String(createdDate.getDate()).padStart(2, '0');
                const hours = String(createdDate.getHours()).padStart(2, '0');
                const minutes = String(createdDate.getMinutes()).padStart(2, '0');
                createdInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
            }
        }
        
        // 加载关键词
        const keywords = video.keywords ? video.keywords.split(' ').filter(Boolean) : [];
        const keywordCategories = video.keyword_categories ? JSON.parse(video.keyword_categories) : {};
        
        currentKeywords = keywords.map(keyword => ({
            keyword,
            category: keywordCategories[keyword] || '其他'
        }));
        
        // 保存原始数据
        originalVideoData = {
            title: video.title,
            author: video.author,
            pic: video.pic,
            description: video.description,
            length: video.length,
            created: video.created,
            keywords: video.keywords,
            keyword_categories: video.keyword_categories
        };
        
        renderKeywords();
    } catch (error) {
        console.error('加载视频信息失败:', error);
        alert('加载视频信息失败');
    }
}

// 取消
function cancel() {
    if (confirm('确定要取消吗？未保存的内容将丢失')) {
        window.location.href = 'index';
    }
}

// 页面加载时检查是否是编辑模式
window.addEventListener('load', async () => {
    updateAdminIndicator();
    
    // 先加载关键词库
    await loadKeywordsFromAPI();
    const bvidParam = getUrlParam('bvid');
    
    if (bvidParam) {
        isEditMode = true;
        document.querySelector('.subtitle').textContent = '编辑视频';
        saveBtn.textContent = '保存修改';
        bvidInput.disabled = true;
        bvidInput.style.backgroundColor = 'rgba(128, 128, 128, 0.5)';
        
        loadVideoInfo(bvidParam);
    }
    
    if (isAdminMode) {
        const deleteBtns = document.querySelectorAll('.delete-keyword-btn');
        deleteBtns.forEach(btn => {
            btn.style.display = 'inline-block';
        });
    }
});

// 事件绑定
parseVideoBtn.addEventListener('click', parseVideoInfo);
parseKeywordsBtn.addEventListener('click', parseKeywords);
addKeywordBtn.addEventListener('click', addKeyword);
saveBtn.addEventListener('click', saveVideo);
cancelBtn.addEventListener('click', cancel);

newKeywordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addKeyword();
    }
});

// 关键词提示功能
const keywordSuggestions = document.getElementById('keywordSuggestions');

// 监听关键词输入
newKeywordInput.addEventListener('input', (e) => {
    const inputValue = e.target.value.trim().toLowerCase();
    
    if (!inputValue) {
        keywordSuggestions.style.display = 'none';
        return;
    }
    
    // 确保关键词库已加载
    if (Object.keys(keywordToCategory).length === 0) {
        keywordSuggestions.style.display = 'none';
        return;
    }
    
    // 过滤匹配的关键词
    const allKeywordsList = Object.keys(keywordToCategory);
    const filteredKeywords = allKeywordsList
        .filter(keyword => keyword.toLowerCase().includes(inputValue))
        .slice(0, 10); // 最多显示10个结果
    
    if (filteredKeywords.length === 0) {
        keywordSuggestions.style.display = 'none';
        return;
    }
    
    // 显示关键词提示
    keywordSuggestions.innerHTML = filteredKeywords.map(keyword => `
        <div class="keyword-suggestion-item" data-keyword="${keyword}">
            ${keyword}
        </div>
    `).join('');
    
    keywordSuggestions.style.display = 'block';
});

// 点击提示项填充输入框
keywordSuggestions.addEventListener('click', (e) => {
    const suggestionItem = e.target.closest('.keyword-suggestion-item');
    if (suggestionItem) {
        const keyword = suggestionItem.dataset.keyword;
        newKeywordInput.value = keyword;
        // 自动设置分类
        if (keywordToCategory[keyword]) {
            newKeywordCategory.value = keywordToCategory[keyword];
        }
        keywordSuggestions.style.display = 'none';
    }
});

// 点击外部关闭提示框
document.addEventListener('click', (e) => {
    if (!e.target.closest('.keywords-input-group')) {
        keywordSuggestions.style.display = 'none';
    }
});

keywordsList.addEventListener('click', (e) => {
    // 只匹配直接点击的删除按钮，避免事件冒泡问题
    if (e.target.classList.contains('delete-keyword-btn')) {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(e.target.dataset.index);
        deleteKeyword(index);
    }
});