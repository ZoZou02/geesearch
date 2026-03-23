const API_BASE_URL = 'https://apizozou.top/api/geesearch/';

// 从API获取关键词库
let keywordLibrary = {};
let keywordToCategory = {};
let allKeywords = [];

// 从API获取关键词库
async function loadKeywordsFromAPI() {
    try {
        const response = await fetch(API_BASE_URL + 'keywords');
        const data = await response.json();
        
        // 构建关键词库
        keywordLibrary = {};
        keywordToCategory = {};
        allKeywords = [];
        
        data.keywords.forEach(item => {
            const category = item.category;
            const keyword = item.keyword;
            
            if (!keywordLibrary[category]) {
                keywordLibrary[category] = [];
            }
            keywordLibrary[category].push(keyword);
            keywordToCategory[keyword] = category;
            allKeywords.push(keyword);
        });
        
        console.log('关键词库加载成功，共', allKeywords.length, '个关键词');
    } catch (error) {
        console.error('加载关键词库失败:', error);
    }
}

// DOM元素
const videoDetailDiv = document.getElementById('videoDetail');

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

// 获取URL参数中的bv号
function getUrlParam(name) {
    const reg = new RegExp(`(^|&)${name}=([^&]*)(&|$)`);
    const r = window.location.search.substr(1).match(reg);
    if (r != null) return decodeURIComponent(r[2]);
    return null;
}

// 根据分类获取颜色
function getColorByCategory(category) {
    const categoryColors = {
        '嘉宾': '#e74c3c',  // 红色
        '游戏': '#9b7707',  // 深金色
        '其他': '#2c3e50'   // 暗蓝色
    };
    return categoryColors[category] || '#7f8c8d';  // 默认灰色
}

// 将视频时长转换为时分秒格式
function formatDuration(duration) {
    if (!duration) return '00:00';
    
    let totalSeconds = 0;
    
    // 处理不同格式的时长
    if (typeof duration === 'number') {
        // 检查是否是分钟数（如果超过3600秒，可能是分钟数）
        if (duration > 3600) {
            // 假设是分钟数
            totalSeconds = Math.floor(duration * 60);
        } else {
            // 假设是秒数
            totalSeconds = Math.floor(duration);
        }
    } else if (typeof duration === 'string') {
        // 如果是字符串，尝试解析
        if (duration.includes(':')) {
            // 处理类似 "617:59" 这样的格式
            const parts = duration.split(':').map(Number);
            if (parts.length === 2) {
                // MM:SS 格式，可能分钟数超过59
                const minutes = parts[0];
                const seconds = parts[1];
                totalSeconds = minutes * 60 + seconds;
            } else if (parts.length === 3) {
                // 已经是 HH:MM:SS 格式
                const hours = parts[0];
                const minutes = parts[1];
                const seconds = parts[2];
                totalSeconds = hours * 3600 + minutes * 60 + seconds;
            } else {
                // 格式不正确，直接返回
                return duration;
            }
        } else {
            // 尝试转换为数字
            const num = parseFloat(duration);
            if (!isNaN(num)) {
                // 检查是否是分钟数（如果超过3600，或者包含分钟相关文本）
                if (num > 3600 || duration.includes('分') || duration.includes('分钟')) {
                    // 假设是分钟数
                    totalSeconds = Math.floor(num * 60);
                } else {
                    // 假设是秒数
                    totalSeconds = Math.floor(num);
                }
            } else {
                // 尝试匹配类似 "123分钟" 的格式
                const minutesMatch = duration.match(/(\d+)\s*(分|分钟)/);
                if (minutesMatch) {
                    const minutes = parseInt(minutesMatch[1]);
                    totalSeconds = minutes * 60;
                } else {
                    // 尝试匹配类似 "1小时23分钟" 的格式
                    const hoursMatch = duration.match(/(\d+)\s*(小时|时)/);
                    const minutesMatch2 = duration.match(/(\d+)\s*(分|分钟)/);
                    let hours = 0;
                    let minutes = 0;
                    if (hoursMatch) {
                        hours = parseInt(hoursMatch[1]);
                    }
                    if (minutesMatch2) {
                        minutes = parseInt(minutesMatch2[1]);
                    }
                    totalSeconds = hours * 3600 + minutes * 60;
                }
            }
        }
    }
    
    // 计算时分秒
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// 格式化发布时间
function formatCreatedTime(created) {
    if (!created) return '未知';
    
    let date;
    if (typeof created === 'number') {
        // 如果是时间戳
        date = new Date(created * 1000);
    } else if (typeof created === 'string') {
        // 如果是字符串，尝试解析
        // 支持格式：'2025-12-21 02:40:58'
        const parts = created.split(' ');
        if (parts.length === 2) {
            const datePart = parts[0]; // '2025-12-21'
            const timePart = parts[1]; // '02:40:58'
            date = new Date(`${datePart}T${timePart}`);
        } else {
            date = new Date(created);
        }
    } else {
        return '未知';
    }
    
    if (isNaN(date.getTime())) return '未知';
    
    // 格式化为：YYYY-MM-DD HH:MM
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// 编辑视频
function editVideo() {
    const bvid = getUrlParam('bvid');
    if (!bvid) return;
    
    window.location.href = `add-video?bvid=${bvid}`;
}

// 删除视频
async function deleteVideo() {
    if (!isAdminMode) {
        alert('需要管理员模式才能删除视频');
        return;
    }
    
    const bvid = getUrlParam('bvid');
    if (!bvid) return;
    
    if (confirm(`确定要删除视频吗？此操作不可恢复！`)) {
        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch(`${API_BASE_URL}/videos/${bvid}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token })
            });
            
            if (response.ok) {
                alert('视频删除成功');
                window.location.href = 'index.html';
            } else {
                const error = await response.json();
                alert(`删除失败: ${error.detail || '未知错误'}`);
            }
        } catch (error) {
            console.error('删除视频出错:', error);
            alert('删除视频时发生网络错误，请稍后重试');
        }
    }
}

// 获取视频详情
async function getVideoDetail(bvid) {
    if (!bvid) {
        videoDetailDiv.innerHTML = '<div class="no-video">请提供有效的BV号</div>';
        return;
    }
    
    // 显示加载状态
    videoDetailDiv.innerHTML = '<div class="loading">正在加载视频详情...</div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/videos/${bvid}`);
        const video = await response.json();
        
        if (!video) {
            videoDetailDiv.innerHTML = '<div class="no-video">未找到该视频</div>';
            return;
        }
        
        // 解析关键词列表
        let keywords = [];
        if (video.keywords) {
            try {
                // 尝试解析为JSON数组（支持包含空格的关键词）
                keywords = JSON.parse(video.keywords);
            } catch (e) {
                // 如果解析失败，可能是旧格式（用空格分隔）
                keywords = video.keywords.split(' ').filter(Boolean);
            }
        }
        // 解析关键词分类
        const keywordCategories = video.keyword_categories ? JSON.parse(video.keyword_categories) : {};
        
        // 按分类分组关键词
        const categories = ['嘉宾', '游戏', '其他'];
        const groupedKeywords = {};
        categories.forEach(category => {
            groupedKeywords[category] = [];
        });
        
        // 将关键词分配到对应的分类
        keywords.forEach(keyword => {
            let category = keywordCategories[keyword] || '其他';
            // 确保分类是有效的，如果无效则使用默认分类
            if (!categories.includes(category)) {
                category = '其他';
            }
            groupedKeywords[category].push(keyword);
        });
        
        // 合并所有分类的关键词，按嘉宾、游戏、其他的顺序
        const sortedKeywords = [];
        categories.forEach(category => {
            // 在每个分类内按字母顺序排序
            groupedKeywords[category].sort();
            // 添加到排序后的关键词列表
            sortedKeywords.push(...groupedKeywords[category]);
        });
        
        // 渲染视频详情
        videoDetailDiv.innerHTML = `
            <section class="video-detail-section">
                <div class="video-header">
                    <img src="${API_BASE_URL}/proxy-image?url=${encodeURIComponent(video.pic)}" alt="${video.title}" class="video-cover-large" loading="lazy">
                    <div class="video-info-large">
                        <div class="video-title-large">${video.title}</div>
                        <div class="video-meta-large">
                            <div class="meta-item">
                                <span class="meta-label">BV号:</span>
                                <span>${video.bvid}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">UP主:</span>
                                <span>${video.author}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">发布时间:</span>
                                <span>${formatCreatedTime(video.created)}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">视频时长:</span>
                                <span>${formatDuration(video.length)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="video-description">
                    <h3>视频描述:</h3>
                    <p>${video.description || '暂无描述'}</p>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; gap: 15px; margin: 20px 0;">
                    <a href="https://www.bilibili.com/video/${video.bvid}" class="bilibili-link" target="_blank">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" fill-rule="evenodd" height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em" class="link-icon">
                            <title>bilibili</title>
                            <path clip-rule="evenodd" d="M4.977 3.561a1.31 1.31 0 111.818-1.884l2.828 2.728c.08.078.149.163.205.254h4.277a1.32 1.32 0 01.205-.254l2.828-2.728a1.31 1.31 0 011.818 1.884L17.82 4.66h.848A5.333 5.333 0 0124 9.992v7.34a5.333 5.333 0 01-5.333 5.334H5.333A5.333 5.333 0 010 17.333V9.992a5.333 5.333 0 015.333-5.333h.781L4.977 3.56zm.356 3.67a2.667 2.667 0 00-2.666 2.667v7.529a2.667 2.667 0 002.666 2.666h13.334a2.667 2.667 0 002.666-2.666v-7.53a2.667 2.667 0 00-2.666-2.666H5.333zm1.334 5.192a1.333 1.333 0 112.666 0v1.192a1.333 1.333 0 11-2.666 0v-1.192zM16 11.09c-.736 0-1.333.597-1.333 1.333v1.192a1.333 1.333 0 102.666 0v-1.192c0-.736-.597-1.333-1.333-1.333z" />
                        </svg>
                        观看
                    </a>
                    <div style="display: flex; gap: 10px;">
                        <button class="back-btn" onclick="window.location.href='index';">返回</button>
                        <button class="edit-video-btn" id="editVideoBtn" style="display: none;" onclick="editVideo();">编辑</button>
                        <button class="delete-video-btn" id="deleteVideoBtn" style="display: none;" onclick="deleteVideo();">删除</button>
                    </div>
                </div>
            </section>
            
            <section class="keywords-section">
                <div class="keywords-header">
                    <h2>关键词</h2>
                </div>
                <div class="keywords-list" id="keywordsList">
                    ${sortedKeywords.map(keyword => {
                        const category = keywordCategories[keyword] || '其他';
                        const bgColor = getColorByCategory(category);
                        return `
                            <div class="keyword-tag" data-keyword="${keyword}" style="background-color: ${bgColor}; color: white; padding: 6px 12px; border: none; font-size: 14px; cursor: pointer; margin-right: 8px; margin-bottom: 8px; display: inline-flex; align-items: center; gap: 6px; font-family: 'Pixel', monospace;">
                                <span>${keyword}</span>
                                <span class="keyword-count" id="count-${keyword}" style="background-color: rgba(255, 255, 255, 0.3); color: white; padding: 2px 8px; font-size: 12px;">--</span>
                                <span class="delete-keyword-btn" data-keyword="${keyword}" style="display: none; margin-left: 4px; cursor: pointer; font-size: 16px; font-weight: bold;">×</span>
                            </div>
                        `;
                    }).join('')}
                    <!-- 添加关键词的可切换组件 -->
                    <div class="add-keyword-wrapper" style="position: relative; display: inline-block;">
                        <!-- 标签选择弹窗 - 绝对定位在+按钮上方 -->
                        <div class="category-dropdown" id="categoryDropdown" style="display: none; position: absolute; bottom: 100%; left: 0; margin-bottom: 10px; padding: 5px 0; background-color: transparent; border: none; z-index: 1000; opacity: 0; transform: translateY(10px); transition: all 0.3s ease;">
                            <div class="category-options" style="display: flex; gap: 8px; justify-content: center;">
                                <span class="category-option" data-category="嘉宾" style="background-color: #e74c3c; color: white; padding: 6px 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: 'Pixel', monospace; transform: skew(-10deg); transition: all 0.2s ease;">嘉宾</span>
                                <span class="category-option" data-category="游戏" style="background-color: #9b7707; color: white; padding: 6px 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: 'Pixel', monospace; transform: skew(-10deg); transition: all 0.2s ease;">游戏</span>
                                <span class="category-option" data-category="其他" style="background-color: #2c3e50; color: white; padding: 6px 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: 'Pixel', monospace; transform: skew(-10deg); transition: all 0.2s ease;">其他</span>
                            </div>
                        </div>
                        
                        <!-- +按钮和输入框的切换容器 -->
                        <div class="keyword-toggle-container" style="display: inline-flex; align-items: center; gap: 0;">
                            <!-- 输入框 - 默认隐藏 -->
                            <input type="text" id="newKeyword" placeholder="输入关键词..." autocomplete="off" style="padding: 6px 12px; font-size: 14px; background-color: rgba(0, 0, 0, 0.7); color: white; border: 2px solid white; font-family: 'Pixel', monospace; transform: skew(-10deg); display: none; transition: all 0.3s ease; width: 0; opacity: 0; box-shadow: none;">
                            
                            <!-- 确认按钮 - 默认隐藏 -->
                            <button id="confirmAddBtn" style="background-color: #fd2d5c; color: white; padding: 6px 12px; border: 2px solid white; border-left: none; font-size: 14px; cursor: pointer; font-family: 'Pixel', monospace; transform: skew(-10deg); display: none; transition: all 0.3s ease; opacity: 0; box-shadow: none;">确认</button>
                            
                            <!-- +按钮 - 默认显示 -->
                            <button class="add-keyword-btn" id="addKeywordBtn" style="background-color: #333; color: white; padding: 6px 12px; border: 2px solid white; font-size: 18px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-family: 'Pixel', monospace; transform: skew(-10deg); transition: all 0.3s ease; min-width: 36px;">+</button>
                        </div>
                    </div>
                </div>
            </section>
        `;
        
        // 为每个关键词获取视频数量
        sortedKeywords.forEach(keyword => {
            getKeywordCount(keyword);
        });
        
        // 使用事件委托处理关键词点击
        const keywordsList = document.getElementById('keywordsList');
        keywordsList.addEventListener('click', async (e) => {
            const keywordTag = e.target.closest('.keyword-tag');
            const deleteBtn = e.target.closest('.delete-keyword-btn');
            
            if (deleteBtn && isAdminMode) {
                // 删除关键词
                const keyword = deleteBtn.dataset.keyword;
                const bvid = getUrlParam('bvid');
                
                if (confirm(`确定要删除关键词"${keyword}"吗？`)) {
                    try {
                        const token = localStorage.getItem('admin_token');
                        const response = await fetch(`${API_BASE_URL}/videos/${bvid}/keywords/${encodeURIComponent(keyword)}`, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ token })
                        });
                        
                        if (response.ok) {
                            alert('关键词删除成功');
                            getVideoDetail(bvid);
                        } else {
                            const error = await response.json();
                            alert(`删除关键词失败: ${error.detail || '未知错误'}`);
                        }
                    } catch (error) {
                        console.error('删除关键词出错:', error);
                        alert('删除关键词时发生网络错误，请稍后重试');
                    }
                }
            } else if (keywordTag && keywordTag.dataset.keyword) {
                // 点击关键词搜索
                const keyword = keywordTag.dataset.keyword;
                searchByKeyword(keyword);
            }
        });
        
        // 如果是管理员模式，显示删除按钮
        if (isAdminMode) {
            const deleteBtns = document.querySelectorAll('.delete-keyword-btn');
            deleteBtns.forEach(btn => {
                btn.style.display = 'inline-block';
            });
            
            const editVideoBtn = document.getElementById('editVideoBtn');
            const deleteVideoBtn = document.getElementById('deleteVideoBtn');
            if (editVideoBtn) editVideoBtn.style.display = 'inline-block';
            if (deleteVideoBtn) deleteVideoBtn.style.display = 'inline-block';
        }
        
        // 初始化变量
        let selectedCategory = '其他';
        
        // 绑定添加关键词按钮事件
        const addKeywordBtn = document.getElementById('addKeywordBtn');
        const categoryDropdown = document.getElementById('categoryDropdown');
        const categoryOptions = document.querySelectorAll('.category-option');
        const confirmAddBtn = document.getElementById('confirmAddBtn');
        const newKeywordInput = document.getElementById('newKeyword');
        const keywordToggleContainer = document.querySelector('.keyword-toggle-container');
        
        // 显示标签选择器
        function showCategoryDropdown() {
            categoryDropdown.style.display = 'block';
            setTimeout(() => {
                categoryDropdown.style.opacity = '1';
                categoryDropdown.style.transform = 'translateY(0)';
            }, 10);
        }
        
        // 隐藏标签选择器
        function hideCategoryDropdown() {
            categoryDropdown.style.opacity = '0';
            categoryDropdown.style.transform = 'translateY(10px)';
            setTimeout(() => {
                categoryDropdown.style.display = 'none';
            }, 300);
        }
        
        // +按钮点击事件：显示标签选择弹窗
        addKeywordBtn.addEventListener('click', () => {
            if (categoryDropdown.style.display === 'block' && categoryDropdown.style.opacity === '1') {
                hideCategoryDropdown();
            } else {
                showCategoryDropdown();
            }
        });
        
        // 点击页面其他地方隐藏标签选择器
        document.addEventListener('click', (e) => {
            if (!categoryDropdown.contains(e.target) && e.target !== addKeywordBtn) {
                hideCategoryDropdown();
            }
        });
        
        // 标签选择事件
        categoryOptions.forEach(option => {
            option.addEventListener('click', () => {
                // 获取选择的分类
                selectedCategory = option.dataset.category;
                
                // 隐藏标签选择器
                hideCategoryDropdown();
                
                // +按钮变为输入框
                addKeywordBtn.style.display = 'none';
                addKeywordBtn.style.opacity = '0';
                
                newKeywordInput.style.display = 'inline-flex';
                newKeywordInput.style.width = '180px';
                newKeywordInput.style.opacity = '1';
                
                confirmAddBtn.style.display = 'inline-flex';
                confirmAddBtn.style.opacity = '1';
                
                // 更新确认按钮的背景色为所选分类的颜色
                const categoryColors = {
                    '嘉宾': '#e74c3c',
                    '游戏': '#ffcc00',
                    '其他': '#2c3e50'
                };
                // 保持输入框的白色边框
                newKeywordInput.style.borderColor = 'white';
                confirmAddBtn.style.backgroundColor = categoryColors[selectedCategory];
                
                // 聚焦输入框
                setTimeout(() => {
                    newKeywordInput.focus();
                }, 300);
            });
        });
        
        // 确认添加按钮事件
        confirmAddBtn.addEventListener('click', () => {
            addKeyword(video.bvid);
        });
        
        // 绑定回车键添加关键词
        newKeywordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addKeyword(video.bvid);
            }
        });
        
        // 添加关键词搜索提示功能
        newKeywordInput.addEventListener('input', () => {
            const searchTerm = newKeywordInput.value.trim().toLowerCase();
            if (searchTerm) {
                showKeywordSuggestions(searchTerm, selectedCategory);
            } else {
                hideKeywordSuggestions();
            }
        });
        
        // 显示关键词搜索建议
        function showKeywordSuggestions(searchTerm, category) {
            hideKeywordSuggestions();
            
            const suggestions = allKeywords.filter(keyword => {
                const keywordCategory = keywordToCategory[keyword];
                return keyword.toLowerCase().includes(searchTerm) && 
                       (category === '其他' || keywordCategory === category);
            }).slice(0, 10);
            
            if (suggestions.length === 0) return;
            
            const suggestionsDiv = document.createElement('div');
            suggestionsDiv.id = 'keywordSuggestions';
            suggestionsDiv.style.cssText = `
                position: absolute;
                bottom: 100%;
                left: 0;
                margin-bottom: 5px;
                background-color: rgba(20, 20, 20, 0.95);
                border: 1px solid #333;
                border-radius: 4px;
                max-height: 200px;
                overflow-y: auto;
                z-index: 1000;
                min-width: 200px;
            `;
            
            suggestionsDiv.innerHTML = suggestions.map(keyword => {
                const keywordCategory = keywordToCategory[keyword];
                const bgColor = getColorByCategory(keywordCategory);
                return `
                    <div class="suggestion-item" data-keyword="${keyword}" style="
                        padding: 8px 12px;
                        cursor: pointer;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-family: 'Pixel', monospace;
                        font-size: 14px;
                    ">
                        <span style="background-color: ${bgColor}; color: white; padding: 2px 8px; font-size: 11px; border-radius: 2px;">${keywordCategory}</span>
                        <span style="color: #ffffff;">${keyword}</span>
                    </div>
                `;
            }).join('');
            
            const wrapper = document.querySelector('.add-keyword-wrapper');
            wrapper.style.position = 'relative';
            wrapper.appendChild(suggestionsDiv);
            
            // 绑定点击事件
            suggestionsDiv.addEventListener('click', (e) => {
                const item = e.target.closest('.suggestion-item');
                if (item) {
                    const keyword = item.dataset.keyword;
                    newKeywordInput.value = keyword;
                    hideKeywordSuggestions();
                    newKeywordInput.focus();
                }
            });
        }
        
        // 隐藏关键词搜索建议
        function hideKeywordSuggestions() {
            const suggestionsDiv = document.getElementById('keywordSuggestions');
            if (suggestionsDiv) {
                suggestionsDiv.remove();
            }
        }
        
        // 点击页面其他地方隐藏搜索建议
        document.addEventListener('click', (e) => {
            if (!newKeywordInput.contains(e.target) && !document.getElementById('keywordSuggestions')?.contains(e.target)) {
                hideKeywordSuggestions();
            }
        });
        
        // 输入框失焦事件：如果没有输入内容，恢复+按钮
        newKeywordInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (!newKeywordInput.value.trim()) {
                    // 重置输入状态：恢复+按钮，隐藏输入框和确认按钮
                    newKeywordInput.value = '';
                    newKeywordInput.style.display = 'none';
                    newKeywordInput.style.width = '0';
                    newKeywordInput.style.opacity = '0';
                    
                    confirmAddBtn.style.display = 'none';
                    confirmAddBtn.style.opacity = '0';
                    
                    addKeywordBtn.style.display = 'inline-flex';
                    addKeywordBtn.style.opacity = '1';
                    
                    selectedCategory = '其他';
                }
            }, 200); // 延迟执行，让点击确认按钮的事件有时间触发
        });
        
        // 修改addKeyword函数，使用selectedCategory变量
        const originalAddKeyword = addKeyword;
        addKeyword = async function(bvid) {
            const newKeyword = newKeywordInput.value.trim();
            if (!newKeyword) {
                alert('请输入关键词');
                return;
            }
            
            try {
                // 调用API添加关键词，使用selectedCategory
                const response = await fetch(`${API_BASE_URL}/videos/${bvid}/keywords?keyword=${encodeURIComponent(newKeyword)}&category=${encodeURIComponent(selectedCategory)}`, {
                    method: 'POST'
                });
                
                if (response.ok) {
                    // 重新加载视频详情，更新关键词列表
                    getVideoDetail(bvid);
                    
                    // 重置输入状态：恢复+按钮，隐藏输入框和确认按钮
                    newKeywordInput.value = '';
                    newKeywordInput.style.display = 'none';
                    newKeywordInput.style.width = '0';
                    newKeywordInput.style.opacity = '0';
                    
                    confirmAddBtn.style.display = 'none';
                    confirmAddBtn.style.opacity = '0';
                    
                    addKeywordBtn.style.display = 'inline-flex';
                    addKeywordBtn.style.opacity = '1';
                    
                    selectedCategory = '其他';
                    
                    // alert('关键词添加成功！');
                } else {
                    const error = await response.json();
                    alert(`添加关键词失败: ${error.detail || '未知错误'}`);
                }
            } catch (error) {
                console.error('添加关键词出错:', error);
                alert('添加关键词时发生网络错误，请稍后重试');
            }
        };
        
    } catch (error) {
        console.error('获取视频详情失败:', error);
        videoDetailDiv.innerHTML = '<div class="no-video">获取视频详情失败，请稍后重试</div>';
    }
}

// 获取关键词对应的视频数量
async function getKeywordCount(keyword) {
    try {
        const response = await fetch(`${API_BASE_URL}/keyword-count/${keyword}`);
        const data = await response.json();
        const countElement = document.getElementById(`count-${keyword}`);
        if (countElement) {
            countElement.textContent = data.count;
        }
    } catch (error) {
        console.error(`获取关键词 ${keyword} 数量失败:`, error);
    }
}

// 通过关键词搜索
function searchByKeyword(keyword) {
    // 跳转到搜索页并执行搜索
    window.location.href = `index?keyword=${encodeURIComponent(keyword)}`;
}

// 添加关键词
async function addKeyword(bvid) {
    const newKeywordInput = document.getElementById('newKeyword');
    const newKeywordCategory = document.getElementById('newKeywordCategory');
    const keyword = newKeywordInput.value.trim();
    const category = newKeywordCategory.value;
    
    if (!keyword) {
        alert('请输入关键词');
        return;
    }
    
    try {
        // 调用API添加关键词
        const response = await fetch(`${API_BASE_URL}/videos/${bvid}/keywords?keyword=${encodeURIComponent(keyword)}&category=${encodeURIComponent(category)}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            // 重新加载视频详情，更新关键词列表
            getVideoDetail(bvid);
            newKeywordInput.value = '';
            alert('关键词添加成功！');
        } else {
            const error = await response.json();
            alert(`添加关键词失败: ${error.detail || '未知错误'}`);
        }
    } catch (error) {
        console.error('添加关键词出错:', error);
        alert('添加关键词时发生网络错误，请稍后重试');
    }
}

// 更新关键词分类
async function updateKeywordCategory(bvid, keyword, category) {
    try {
        // 调用API更新关键词分类
        const response = await fetch(`${API_BASE_URL}/videos/${bvid}/keywords/${encodeURIComponent(keyword)}/category?category=${encodeURIComponent(category)}`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            // 重新加载视频详情，更新关键词列表
            getVideoDetail(bvid);
        } else {
            const error = await response.json();
            alert(`更新关键词分类失败: ${error.detail || '未知错误'}`);
        }
    } catch (error) {
        console.error('更新关键词分类出错:', error);
        alert('更新关键词分类时发生网络错误，请稍后重试');
    }
}

// 页面加载时获取视频详情
window.addEventListener('load', async () => {
    updateAdminIndicator();
    
    // 先加载关键词库
    await loadKeywordsFromAPI();
    const bvid = getUrlParam('bvid');
    getVideoDetail(bvid);
});

// 将函数暴露到全局作用域，以便 HTML 中的 onclick 可以访问
window.editVideo = editVideo;
window.deleteVideo = deleteVideo;
