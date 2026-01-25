const API_BASE_URL = 'https://vendora.fun/api/geesearch/';

// DOM元素
const keywordInput = document.getElementById('keyword');
const searchBtn = document.getElementById('search-btn');
const clearBtn = document.getElementById('clearBtn');
const resultsDiv = document.getElementById('results');
const loadingDiv = document.getElementById('loading');
const statsSpan = document.getElementById('stats');
const hotKeywordsDiv = document.getElementById('hotKeywords');
const searchHistoryDiv = document.getElementById('searchHistory');

// 搜索历史常量
const HISTORY_KEY = 'bilibili_search_history';
const MAX_HISTORY_ITEMS = 10;

// 管理员模式状态
let isAdminMode = localStorage.getItem('admin_token') !== null;

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

// 分页相关变量
let currentPage = 1;
const pageSize = 42; // 每页显示42个视频（6行×7列）
let currentSearchKeyword = '';
let isSearching = false;

// 保存搜索历史
function saveSearchHistory(keyword) {
    if (!keyword.trim()) return;
    
    // 获取现有历史
    let history = getSearchHistory();
    
    // 移除重复项
    history = history.filter(item => item !== keyword);
    
    // 添加到历史开头
    history.unshift(keyword);
    
    // 限制历史记录数量
    if (history.length > MAX_HISTORY_ITEMS) {
        history = history.slice(0, MAX_HISTORY_ITEMS);
    }
    
    // 保存到localStorage
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// 获取搜索历史
function getSearchHistory() {
    try {
        const history = localStorage.getItem(HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    } catch (error) {
        console.error('获取搜索历史失败:', error);
        return [];
    }
}

// 过滤匹配的关键词
function filterKeywords(input) {
    if (!input.trim()) {
        return [];
    }
    
    const inputLower = input.toLowerCase();
    return allKeywords.filter(keyword => 
        keyword.toLowerCase().includes(inputLower)
    ).slice(0, 5); // 最多显示5个匹配关键词
}

// 显示搜索历史和关键词提示
function showSearchHistory() {
    const inputValue = keywordInput.value.trim();
    const history = getSearchHistory();
    
    // 渲染历史记录和关键词提示
    let html = '';
    
    if (!inputValue) {
        // 没有输入时，只显示历史记录
        if (history.length > 0) {
            history.forEach(keyword => {
                html += `<div class="search-history-item">${keyword}</div>`;
            });
            html += '<div style="height: 1px; background-color: #fd2d5c; margin: 5px 0;"></div>';
            html += '<div class="clear-history">清除历史记录</div>';
        }
    } else {
        // 有输入时，显示匹配的历史记录和关键词库
        const inputLower = inputValue.toLowerCase();
        
        // 显示匹配的历史记录
        const historyMatches = history.filter(keyword => 
            keyword.toLowerCase().includes(inputLower)
        );
        
        historyMatches.forEach(keyword => {
            html += `<div class="search-history-item">${keyword}</div>`;
        });
        
        // 显示匹配的关键词库（排除历史记录中已有的）
        const keywordMatches = allKeywords.filter(keyword => 
            !history.includes(keyword) && 
            keyword.toLowerCase().includes(inputLower)
        );
        
        keywordMatches.slice(0, 5).forEach(keyword => {
            html += `<div class="search-history-item keyword-suggestion">${keyword}</div>`;
        });
    }
    
    // 只有当有内容时才显示
    if (html) {
        searchHistoryDiv.innerHTML = html;
        searchHistoryDiv.style.display = 'block';
        
        // 绑定事件
        bindHistoryEvents();
    } else {
        searchHistoryDiv.style.display = 'none';
    }
}

// 隐藏搜索历史
function hideSearchHistory() {
    searchHistoryDiv.style.display = 'none';
}

// 清除搜索历史
function clearSearchHistory() {
    localStorage.removeItem(HISTORY_KEY);
    hideSearchHistory();
}

// 绑定历史记录事件
function bindHistoryEvents() {
    // 历史项点击事件
    const historyItems = document.querySelectorAll('.search-history-item');
    historyItems.forEach(item => {
        item.addEventListener('click', () => {
            const keyword = item.textContent;
            keywordInput.value = keyword;
            searchVideos(keyword);
            hideSearchHistory();
        });
    });
    
    // 清除历史按钮事件
    const clearHistoryBtn = document.querySelector('.clear-history');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearSearchHistory);
    }
}

// 更新清空按钮显示状态
function updateClearBtnVisibility() {
    if (keywordInput.value.trim()) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
    }
}

// 更新管理员指示器
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
                window.location.href = 'index.html';
            };
            
            document.getElementById('addVideoBtn').onclick = (e) => {
                e.stopPropagation();
                window.location.href = 'add-video.html';
            };
            
            document.getElementById('keywordAdminBtn').onclick = (e) => {
                e.stopPropagation();
                window.location.href = 'keyword-admin.html';
            };
            
            document.getElementById('exitAdminBtn').onclick = () => {
                isAdminMode = false;
                localStorage.removeItem('admin_token');
                alert('已退出管理员模式');
                updateAdminIndicator();
            };
        }
    } else {
        if (indicator) {
            indicator.remove();
        }
    }
}

// 清空输入框
function clearInput() {
    keywordInput.value = '';
    updateClearBtnVisibility();
    keywordInput.focus();
    // 清空输入框后显示推荐列表
    getRecommendedVideos();
}

// 绑定搜索历史相关事件
function bindSearchHistoryEvents() {
    // 输入框焦点事件
    keywordInput.addEventListener('focus', showSearchHistory);
    
    // 输入框输入事件
    keywordInput.addEventListener('input', (e) => {
        showSearchHistory();
        updateClearBtnVisibility();
    });
    
    // 点击页面其他地方隐藏历史
    document.addEventListener('click', (e) => {
        if (!keywordInput.contains(e.target) && !searchHistoryDiv.contains(e.target)) {
            hideSearchHistory();
        }
    });
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
            // 已经是时分秒格式
            return duration;
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

// 获取热门关键词
async function getHotKeywords() {
    try {
        const response = await fetch(`${API_BASE_URL}/hot-keywords`);
        const keywords = await response.json();

        // 渲染热门关键词，如果没有则不显示
        if (keywords.length > 0) {
            // 按嘉宾、游戏、其他分类，并按搜索次数降序排序
            const categories = ['嘉宾', '游戏', '其他'];

            // 按分类分组
            const groupedKeywords = categories.map(category => ({
                category,
                keywords: keywords
                    .filter(item => item.category === category)
                    .sort((a, b) => b.search_count - a.search_count)
            }));

            // 渲染分组后的关键词
            let html = '';
            groupedKeywords.forEach(group => {
                if (group.keywords.length > 0) {
                    // 获取该分类的颜色
                    const bgColor = getColorByCategory(group.category);

                    // 渲染该分类的关键词
                    group.keywords.forEach(item => {
                        html += `
                            <span class="keyword-tag" onclick="searchVideos('${item.keyword}')" 
                                  style="background-color: ${bgColor}; color: white; padding: 6px 12px; border: none; 
                                         font-size: 14px; cursor: pointer; transition: all 0.3s; 
                                         margin-right: 8px; margin-bottom: 8px; display: inline-block;">
                                ${item.keyword}
                            </span>
                        `;
                    });
                }
            });

            hotKeywordsDiv.innerHTML = html;
        } else {
            // 如果没有热门关键词，隐藏该区域
            document.querySelector('.hot-keywords').style.display = 'none';
        }
    } catch (error) {
        console.error('获取热门关键词失败:', error);
        // 出错时也隐藏该区域
        document.querySelector('.hot-keywords').style.display = 'none';
    }
}

// 渲染视频列表
function renderVideos(data, isSearch = false) {
    const { results, total, page, limit } = data;

    // 渲染视频网格
    let html = `
        <div class="video-grid">
            ${results.map(result => {
        // 解析关键词和分类
        let keywords = [];
        if (result.keywords) {
            try {
                // 尝试解析为JSON数组（支持包含空格的关键词）
                keywords = JSON.parse(result.keywords);
            } catch (e) {
                // 如果解析失败，可能是旧格式（用空格分隔）
                keywords = result.keywords.split(' ').filter(Boolean);
            }
        }
        const keywordCategories = result.keyword_categories ? JSON.parse(result.keyword_categories) : {};

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

        // 只显示前6个关键词
        const displayKeywords = sortedKeywords.slice(0, 6);

        // 渲染关键词列表
        const keywordsHtml = displayKeywords.map(keyword => {
            const category = keywordCategories[keyword] || '其他';
            const bgColor = getColorByCategory(category);
            return `
                        <span class="keyword-tag" onclick="event.stopPropagation(); searchVideos('${keyword}')" 
                              style="background-color: ${bgColor}; color: white; padding: 2px 8px; 
                                     font-size: 10px; cursor: pointer; margin-right: 4px; margin-bottom: 4px; display: inline-flex; align-items: center; gap: 6px; font-family: 'Pixel', monospace; transform: skew(-10deg);">
                            ${keyword}
                        </span>
                    `;
        }).join('');

        return `
                    <div class="video-card" data-bvid="${result.bvid}">
                        <img src="${API_BASE_URL}/proxy-image?url=${encodeURIComponent(result.pic)}" alt="${result.title}" class="video-cover" loading="lazy">
                        <div class="video-info">
                            <div style="flex-grow: 1;">
                                <div class="video-title">${result.title.replace(/^(我Geebar谁啊-|\[我Geebar谁啊\/直播录播\]-)/, '')}</div>
                                <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px;">
                                    ${keywordsHtml}
                                </div>
                            </div>
                            <div class="video-meta">
                                <div class="video-meta-row">
                                    <span class="video-bv">${result.bvid}</span>
                                </div>
                                <div class="video-date">${result.created}</div>
                            </div>
                        </div>
                    </div>
                `;
    }).join('')}
        </div>
    `;

    // 添加分页控件
    const totalPages = Math.ceil(total / limit);
    
    // 生成页码数组
    let pageNumbers = [];
    const maxVisiblePages = 7;
    
    if (totalPages <= maxVisiblePages) {
        // 如果总页数 <= 7，显示所有页码
        for (let i = 1; i <= totalPages; i++) {
            pageNumbers.push(i);
        }
    } else {
        // 否则显示7个页码，包括当前页前后的页码和首尾页
        const leftSide = Math.floor((maxVisiblePages - 3) / 2);
        const rightSide = Math.ceil((maxVisiblePages - 3) / 2);
        
        if (page <= leftSide + 2) {
            // 当前页靠近首页
            for (let i = 1; i <= leftSide + 3; i++) {
                pageNumbers.push(i);
            }
            pageNumbers.push('...');
            pageNumbers.push(totalPages - 1);
            pageNumbers.push(totalPages);
        } else if (page >= totalPages - rightSide - 1) {
            // 当前页靠近尾页
            pageNumbers.push(1);
            pageNumbers.push(2);
            pageNumbers.push('...');
            for (let i = totalPages - rightSide - 2; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            // 当前页在中间
            pageNumbers.push(1);
            pageNumbers.push('...');
            for (let i = page - leftSide; i <= page + rightSide; i++) {
                pageNumbers.push(i);
            }
            pageNumbers.push('...');
            pageNumbers.push(totalPages);
        }
    }
    
    // 生成页码HTML
    let pagesHtml = '';
    
    // 上一页按钮
    if (page > 1) {
        pagesHtml += `<button class="pagination-btn" onclick="changePage(${page - 1})">上一页</button>`;
    }
    
    // 页码按钮
    pageNumbers.forEach(num => {
        if (num === '...') {
            pagesHtml += `<span class="pagination-ellipsis">...</span>`;
        } else if (num === page) {
            pagesHtml += `<button class="pagination-btn active" onclick="changePage(${num})"><span class="page-number">${num}</span></button>`;
        } else {
            pagesHtml += `<button class="pagination-btn" onclick="changePage(${num})"><span class="page-number">${num}</span></button>`;
        }
    });
    
    // 下一页按钮
    if (page < totalPages) {
        pagesHtml += `<button class="pagination-btn" onclick="changePage(${page + 1})">下一页</button>`;
    }
    
    // 跳页功能
    pagesHtml += `
        <span class="pagination-info">
            共 ${totalPages} 页 / ${total} 个
        </span>
        <span class="jump-page">
            跳至
            <input type="number" class="jump-input" id="jumpPage" min="1" max="${totalPages}" value="" onkeypress="if(event.keyCode===13) jumpToPage(${totalPages})" onblur="jumpToPage(${totalPages})" autocomplete="off" autocorrect="off" autocapitalize="off" style="-moz-appearance:textfield; appearance:textfield;">
            页
        </span>
    `;
    
    html += `
        <div class="pagination">
            ${pagesHtml}
        </div>
    `;

    return html;
}

// 搜索函数
async function searchVideos(keyword, page = 1) {
    if (!keyword.trim()) {
        // 搜索框为空时，显示推荐列表
        getRecommendedVideos(page);
        return;
    }

    // 检查是否是管理员口令
    if (keyword.startsWith('admin:')) {
        const password = keyword.substring(6);
        try {
            const response = await fetch(`${API_BASE_URL}/admin/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });
            
            if (response.ok) {
                const data = await response.json();
                isAdminMode = !isAdminMode;
                if (isAdminMode) {
                    localStorage.setItem('admin_token', data.token);
                } else {
                    localStorage.removeItem('admin_token');
                }
                alert(isAdminMode ? '已进入管理员模式' : '已退出管理员模式');
                keywordInput.value = '';
                hideSearchHistory();
                updateAdminIndicator();
                return;
            } else {
                alert('管理员口令错误');
                keywordInput.value = '';
                return;
            }
        } catch (error) {
            console.error('验证管理员口令失败:', error);
            alert('验证管理员口令时发生错误');
            return;
        }
    }

    // 保存搜索历史
    saveSearchHistory(keyword);
    
    // 显示加载状态
    loadingDiv.classList.add('active');
    resultsDiv.innerHTML = '';

    // 更新输入框内容
    keywordInput.value = keyword;
    // 更新清空按钮显示状态
    updateClearBtnVisibility();

    // 更新状态
    currentSearchKeyword = keyword;
    isSearching = true;
    currentPage = page;

    try {
        const response = await fetch(`${API_BASE_URL}/search?keyword=${encodeURIComponent(keyword)}&page=${page}&limit=${pageSize}`);
        const data = await response.json();

        // 更新统计信息
        statsSpan.textContent = `找到 ${data.total} 条相关结果`;

        // 渲染结果
        if (data.results.length === 0) {
            resultsDiv.innerHTML = '<div class="no-results">没有找到相关内容</div>';
        } else {
            resultsDiv.innerHTML = renderVideos(data, true);
        }
    } catch (error) {
        console.error('搜索失败:', error);
        resultsDiv.innerHTML = '<div class="no-results">搜索失败，请稍后重试</div>';
        statsSpan.textContent = '搜索失败';
    } finally {
        // 隐藏加载状态
        loadingDiv.classList.remove('active');
        // 隐藏搜索历史
        hideSearchHistory();
    }
}

// 打开视频详情页
function openVideoDetail(bvid) {
    // 保存当前状态到sessionStorage，无论是否在搜索状态
    sessionStorage.setItem('bilibili_search_state', JSON.stringify({
        keyword: currentSearchKeyword,
        page: currentPage,
        isSearching: isSearching
    }));
    // 在当前页面打开视频详情，或者跳转到新页面
    window.location.href = `detail.html?bvid=${bvid}`;
}

// 获取推荐视频
async function getRecommendedVideos(page = 1) {
    try {
        // 获取推荐视频列表（包含总数量）
        const videosResponse = await fetch(`${API_BASE_URL}/videos?page=${page}&limit=${pageSize}`);
        const data = await videosResponse.json();

        // 更新统计信息，显示真实的总视频数量
        statsSpan.textContent = `共收录 ${data.total} 条视频，点击热门关键词或输入关键词开始搜索`;

        // 渲染推荐视频
        resultsDiv.innerHTML = renderVideos(data);

        // 更新状态
        currentSearchKeyword = '';
        isSearching = false;
        currentPage = page;
    } catch (error) {
        console.error('获取推荐视频失败:', error);
    }
}

// 分页切换函数
function changePage(page) {
    if (isSearching) {
        // 如果正在搜索状态，调用搜索函数
        searchVideos(currentSearchKeyword, page);
    } else {
        // 否则调用推荐视频函数
        getRecommendedVideos(page);
    }
}

// 跳页函数
function jumpToPage(totalPages) {
    const jumpInput = document.getElementById('jumpPage');
    let page = parseInt(jumpInput.value);
    
    // 验证页码范围，如果为空或无效则不执行跳转
    if (isNaN(page) || page < 1 || page > totalPages) {
        return;
    }
    
    // 跳转到指定页码
    changePage(page);
}

// 绑定事件
searchBtn.addEventListener('click', () => {
    searchVideos(keywordInput.value);
});

keywordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchVideos(keywordInput.value);
    }
});

// 清空按钮点击事件
clearBtn.addEventListener('click', clearInput);

// 使用事件委托处理视频卡片点击
document.addEventListener('click', (e) => {
    // 检查点击的元素是否是视频卡片或其子元素
    const videoCard = e.target.closest('.video-card');
    if (videoCard) {
        // 从data-bvid属性获取bvid
        const bvid = videoCard.getAttribute('data-bvid');
        if (bvid) {
            openVideoDetail(bvid);
        }
    }
});

// 获取URL参数中的关键词
function getUrlParam(name) {
    const reg = new RegExp(`(^|&)${name}=([^&]*)(&|$)`);
    const r = window.location.search.substr(1).match(reg);
    if (r != null) return decodeURIComponent(r[2]);
    return null;
}

// 页面加载时初始化
window.addEventListener('load', async () => {
    // 先加载关键词库
    await loadKeywordsFromAPI();
    // 绑定搜索历史事件
    bindSearchHistoryEvents();
    
    // 初始化清空按钮状态
    updateClearBtnVisibility();
    
    // 更新管理员指示器
    updateAdminIndicator();
    
    // 获取热门关键词
    await getHotKeywords();

    // 优先检查URL参数中是否有关键词
    const urlKeyword = getUrlParam('keyword');
    if (urlKeyword) {
        // 如果有，直接执行搜索
        keywordInput.value = urlKeyword;
        await searchVideos(urlKeyword);
        return;
    }

    // 检查sessionStorage中是否有保存的搜索状态
    const savedState = sessionStorage.getItem('bilibili_search_state');
    
    if (savedState) {
        // 恢复搜索状态
        const { keyword, page, isSearching: savedIsSearching } = JSON.parse(savedState);
        
        if (savedIsSearching && keyword) {
            // 执行搜索
            keywordInput.value = keyword;
            await searchVideos(keyword, page);
            // 清除保存的状态，避免重复恢复
            sessionStorage.removeItem('bilibili_search_state');
            return;
        } else {
            // 恢复推荐视频的页码
            await getRecommendedVideos(page);
            // 清除保存的状态，避免重复恢复
            sessionStorage.removeItem('bilibili_search_state');
            return;
        }
    }

    // 否则显示推荐视频
    await getRecommendedVideos();
});

// 将函数暴露到全局作用域，以便 HTML 中的 onclick 可以访问
window.searchVideos = searchVideos;
window.changePage = changePage;
window.jumpToPage = jumpToPage;