const API_BASE_URL = 'https://vendora.fun/api/geesearch/';

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
                location.reload();
            };
        }
    } else {
        if (indicator) {
            indicator.remove();
        }
    }
}

// 关键词库
let keywordLibrary = {};
let keywordToCategory = {};
let allKeywords = [];

// DOM元素（在页面加载后初始化）
let keywordInput, categoryInput, descriptionInput, addKeywordBtn, keywordsList, filterCategory;

// 根据分类获取颜色
function getColorByCategory(category) {
    const categoryColors = {
        '嘉宾': '#e74c3c',
        '游戏': '#9b7707',
        '其他': '#2c3e50'
    };
    return categoryColors[category] || '#7f8c8d';
}

// 从API获取关键词库
async function loadKeywordsFromAPI() {
    try {
        const response = await fetch(`${API_BASE_URL}/keywords`);
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
        renderKeywords();
    } catch (error) {
        console.error('加载关键词库失败:', error);
        alert('加载关键词库失败，请稍后重试');
    }
}

// 渲染关键词列表
function renderKeywords() {
    const filterValue = filterCategory ? filterCategory.value : '';
    let filteredKeywords = allKeywords;
    
    if (filterValue) {
        filteredKeywords = keywordLibrary[filterValue] || [];
    }
    
    keywordsList.innerHTML = filteredKeywords.map(keyword => {
        const category = keywordToCategory[keyword];
        const bgColor = getColorByCategory(category);
        return `
            <div class="keyword-item-wrapper" data-keyword="${keyword}" style="display: inline-block; margin-right: 8px; margin-bottom: 8px;">
                <div class="keyword-tag" data-keyword="${keyword}" style="background-color: ${bgColor}; color: white; padding: 6px 12px; border: none; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: 'Pixel', monospace;">
                    <span>${keyword}</span>
                    <span class="edit-synonym-btn" data-keyword="${keyword}" style="display: inline-block; margin-left: 4px; cursor: pointer; font-size: 12px; opacity: 0.7;">✎</span>
                    <span class="delete-keyword-btn" data-keyword="${keyword}" style="display: ${isAdminMode ? 'inline-block' : 'none'}; margin-left: 4px; cursor: pointer; font-size: 16px; font-weight: bold;">×</span>
                </div>
                <div class="synonym-info" data-keyword="${keyword}" style="margin-top: 4px; font-size: 12px; color: #666;">
                    加载中...
                </div>
            </div>
        `;
    }).join('');
    
    // 加载每个关键词的同义词信息
    filteredKeywords.forEach(keyword => {
        loadSynonymInfoForDisplay(keyword);
    });
}

// 加载关键词的同义词信息并显示
async function loadSynonymInfoForDisplay(keyword) {
    try {
        const response = await fetch(`${API_BASE_URL}/keywords/${encodeURIComponent(keyword)}`);
        const data = await response.json();
        
        const infoElement = document.querySelector(`.synonym-info[data-keyword="${keyword}"]`);
        const editButton = document.querySelector(`.edit-synonym-btn[data-keyword="${keyword}"]`);
        
        // 判断是否是主关键词：main_keyword指向自己
        const isMain = data.main_keyword === keyword;
        const isNormal = data.main_keyword === null;
        
        if (isMain || isNormal) {
            // 这是主关键词或普通关键词，显示编辑按钮
            infoElement.innerHTML = '';
            
            // 显示编辑按钮
            if (editButton) {
                editButton.style.display = 'inline-block';
            }
        } else {
            // 这是同义词，隐藏编辑按钮
            infoElement.innerHTML = '';
            
            // 隐藏编辑按钮
            if (editButton) {
                editButton.style.display = 'none';
            }
        }
    } catch (error) {
        console.error(`加载关键词${keyword}的同义词信息失败:`, error);
        const infoElement = document.querySelector(`.synonym-info[data-keyword="${keyword}"]`);
        if (infoElement) {
            infoElement.innerHTML = '加载失败';
        }
    }
}

// 添加关键词
async function addKeyword() {
    const keyword = keywordInput.value.trim();
    const category = categoryInput.value;
    const description = descriptionInput.value.trim();
    
    if (!keyword || !category) {
        alert('请输入关键词和选择分类');
        return;
    }
    
    if (keywordToCategory[keyword]) {
        alert('关键词已存在');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/keywords`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                keyword,
                category,
                description
            })
        });
        
        if (response.ok) {
            alert('关键词添加成功');
            keywordInput.value = '';
            descriptionInput.value = '';
            await loadKeywordsFromAPI();
        } else {
            const error = await response.json();
            alert(`添加失败: ${error.detail || '未知错误'}`);
        }
    } catch (error) {
        console.error('添加关键词出错:', error);
        alert('添加关键词时发生网络错误，请稍后重试');
    }
}

// 删除关键词
async function deleteKeyword(keyword) {
    if (!isAdminMode) {
        alert('需要管理员模式才能删除关键词');
        return;
    }
    
    if (confirm(`确定要删除关键词"${keyword}"吗？`)) {
        try {
            const token = localStorage.getItem('admin_token');
            const response = await fetch(`${API_BASE_URL}/keywords/${encodeURIComponent(keyword)}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token })
            });
            
            if (response.ok) {
                alert('关键词删除成功');
                await loadKeywordsFromAPI();
            } else {
                const error = await response.json();
                alert(`删除失败: ${error.detail || '未知错误'}`);
            }
        } catch (error) {
            console.error('删除关键词出错:', error);
            alert('删除关键词时发生网络错误，请稍后重试');
        }
    }
}

// 页面加载时初始化
window.addEventListener('load', async () => {
    // 初始化DOM元素
    keywordInput = document.getElementById('keywordInput');
    categoryInput = document.getElementById('categoryInput');
    descriptionInput = document.getElementById('descriptionInput');
    addKeywordBtn = document.getElementById('addKeywordBtn');
    keywordsList = document.getElementById('keywordsList');
    filterCategory = document.getElementById('filterCategory');
    
    // 检查所有元素是否正确获取
    if (!keywordInput || !categoryInput || !descriptionInput || !addKeywordBtn || 
        !keywordsList || !filterCategory) {
        console.error('部分DOM元素未找到');
        alert('页面加载失败，请刷新重试');
        return;
    }
    
    updateAdminIndicator();
    
    await loadKeywordsFromAPI();
    
    if (isAdminMode) {
        const deleteBtns = document.querySelectorAll('.delete-keyword-btn');
        deleteBtns.forEach(btn => {
            btn.style.display = 'inline-block';
        });
    }
    
    // 绑定事件
    if (addKeywordBtn) {
        addKeywordBtn.addEventListener('click', addKeyword);
    }
    if (filterCategory) {
        filterCategory.addEventListener('change', renderKeywords);
    }
    if (keywordInput) {
        keywordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addKeyword();
            }
        });
    }
    
    if (keywordsList) {
        keywordsList.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-keyword-btn');
            if (deleteBtn) {
                const keyword = deleteBtn.dataset.keyword;
                deleteKeyword(keyword);
            }
            
            const editBtn = e.target.closest('.edit-synonym-btn');
            if (editBtn) {
                const keyword = editBtn.dataset.keyword;
                openSynonymModal(keyword);
            }
        });
    }
});

// 编辑同义词相关变量
let currentEditingKeyword = '';
let editingSynonyms = [];

// 打开编辑同义词模态框
async function openSynonymModal(keyword) {
    currentEditingKeyword = keyword;
    editingSynonyms = [];
    
    document.getElementById('synonymCurrentKeyword').textContent = keyword;
    document.getElementById('synonymSearch').value = '';
    document.getElementById('synonymList').innerHTML = '';
    
    const modal = document.getElementById('editSynonymModal');
    modal.style.display = 'flex';
    
    try {
        // 查找所有同义词
        const allKeywordsResponse = await fetch(`${API_BASE_URL}/keywords`);
        const allKeywordsData = await allKeywordsResponse.json();
        
        editingSynonyms = allKeywordsData.keywords
            .filter(k => k.main_keyword === keyword && k.keyword !== keyword)
            .map(k => k.keyword);
        
        renderSynonymList();
    } catch (error) {
        console.error('加载同义词失败:', error);
    }
}

// 渲染编辑模式下的同义词列表
function renderSynonymList() {
    const list = document.getElementById('synonymList');
    list.innerHTML = editingSynonyms.map(keyword => {
        const category = keywordToCategory[keyword];
        const bgColor = getColorByCategory(category);
        return `
            <div class="synonym-tag" data-keyword="${keyword}" style="background-color: ${bgColor}; color: white; padding: 6px 12px; border-radius: 4px; display: inline-flex; align-items: center; gap: 6px; font-family: 'Pixel', monospace; font-size: 14px;">
                <span>${keyword}</span>
                <span class="remove-synonym-btn" data-keyword="${keyword}" style="cursor: pointer; font-size: 16px; font-weight: bold;">×</span>
            </div>
        `;
    }).join('');
}

// 搜索编辑模式下的同义词
function searchSynonyms() {
    const searchTerm = document.getElementById('synonymSearch').value.trim().toLowerCase();
    if (!searchTerm) return [];
    
    return allKeywords.filter(keyword => 
        keyword.toLowerCase().includes(searchTerm) &&
        keyword !== currentEditingKeyword &&
        !editingSynonyms.includes(keyword)
    ).slice(0, 10);
}

// 显示编辑模式下的搜索结果
function showSynonymSearchResults() {
    const results = searchSynonyms();
    if (results.length === 0) {
        hideSynonymSearchResults();
        return;
    }
    
    let existingDropdown = document.getElementById('synonymSearchDropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }
    
    const dropdown = document.createElement('div');
    dropdown.id = 'synonymSearchDropdown';
    dropdown.className = 'synonym-search-dropdown';
    dropdown.style.cssText = 'position: absolute; top: 100%; left: 0; right: 0; margin-top: 5px; background-color: rgba(20, 20, 20, 0.95); border: 1px solid #333; border-radius: 4px; max-height: 200px; overflow-y: auto; z-index: 10001;';
    dropdown.innerHTML = results.map(keyword => {
        const category = keywordToCategory[keyword];
        const bgColor = getColorByCategory(category);
        return `
            <div class="synonym-search-result" data-keyword="${keyword}" style="background-color: rgba(0, 0, 0, 0.9); padding: 8px 12px; cursor: pointer; border-bottom: 1px solid rgba(253, 45, 92, 0.2); font-family: 'Pixel', monospace; font-size: 14px;">
                <span style="background-color: ${bgColor}; color: white; padding: 2px 8px; font-size: 11px; margin-right: 8px;">${category}</span>
                <span style="color: #ffffff;">${keyword}</span>
            </div>
        `;
    }).join('');
    
    const inputContainer = document.getElementById('synonymSearch').parentElement;
    inputContainer.style.position = 'relative';
    inputContainer.appendChild(dropdown);
}

// 隐藏编辑模式下的搜索结果
function hideSynonymSearchResults() {
    const dropdown = document.getElementById('synonymSearchDropdown');
    if (dropdown) {
        dropdown.remove();
    }
}

// 添加编辑模式下的同义词
function addSynonym(keyword) {
    if (!editingSynonyms.includes(keyword) && keyword !== currentEditingKeyword) {
        editingSynonyms.push(keyword);
        renderSynonymList();
        document.getElementById('synonymSearch').value = '';
        hideSynonymSearchResults();
    }
}

// 移除编辑模式下的同义词
function removeSynonym(keyword) {
    editingSynonyms = editingSynonyms.filter(k => k !== keyword);
    renderSynonymList();
}

// 保存编辑的同义词
async function saveSynonyms() {
    try {
        const token = localStorage.getItem('admin_token');
        
        // 使用后端的批量更新接口
        const response = await fetch(`${API_BASE_URL}/keywords/${encodeURIComponent(currentEditingKeyword)}/related`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                synonyms: editingSynonyms,
                token
            })
        });
        
        if (response.ok) {
            alert('同义词更新成功');
            closeSynonymModal();
            await loadKeywordsFromAPI();
        } else {
            const error = await response.json();
            alert(`更新失败: ${error.detail || '未知错误'}`);
        }
    } catch (error) {
        console.error('更新同义词出错:', error);
        alert('更新同义词时发生网络错误，请稍后重试');
    }
}

// 关闭编辑模态框
function closeSynonymModal() {
    const modal = document.getElementById('editSynonymModal');
    modal.style.display = 'none';
    currentEditingKeyword = '';
    editingSynonyms = [];
    hideSynonymSearchResults();
}

// 编辑模态框事件绑定
document.getElementById('closeSynonymModal').addEventListener('click', (e) => {
    e.stopPropagation();
    closeSynonymModal();
});
document.getElementById('cancelSynonymBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    closeSynonymModal();
});
document.getElementById('saveSynonymBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    saveSynonyms();
});

// 点击模态框外部关闭
document.getElementById('editSynonymModal').addEventListener('click', (e) => {
    if (e.target.id === 'editSynonymModal') {
        closeSynonymModal();
    }
});

document.getElementById('synonymSearch').addEventListener('input', () => {
    if (document.getElementById('synonymSearch').value.trim()) {
        showSynonymSearchResults();
    } else {
        hideSynonymSearchResults();
    }
});

document.getElementById('synonymSearch').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const results = searchSynonyms();
        if (results.length > 0) {
            addSynonym(results[0]);
        }
    }
});

document.getElementById('addSynonymBtn').addEventListener('click', () => {
    const keyword = document.getElementById('synonymSearch').value.trim();
    if (keyword) {
        if (keywordToCategory[keyword] && keyword !== currentEditingKeyword) {
            addSynonym(keyword);
        } else {
            alert('关键词不存在或不能关联自己');
        }
    }
});

document.getElementById('synonymList').addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.remove-synonym-btn');
    if (removeBtn) {
        const keyword = removeBtn.dataset.keyword;
        removeSynonym(keyword);
    }
});

document.addEventListener('click', (e) => {
    if (!document.getElementById('synonymSearch').contains(e.target) && 
        !document.getElementById('synonymSearchDropdown')?.contains(e.target)) {
        hideSynonymSearchResults();
    }
});

document.addEventListener('click', (e) => {
    const resultItem = e.target.closest('.synonym-search-result');
    if (resultItem) {
        const keyword = resultItem.dataset.keyword;
        addSynonym(keyword);
    }
});
