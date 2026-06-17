(function (global) {
  const BLOCK_TYPES = [
    { name: '攻擊', icon: '⚔', color: '#FF6663', stat: 'attack', weight: 35, clearSpeed: 260 },
    { name: '防禦', icon: '🛡', color: '#60A5FA', stat: 'defense', weight: 35, clearSpeed: 260 },
    { name: '法術', icon: '✦', color: '#A78BFA', stat: 'spell', weight: 20, clearSpeed: 260 },
    { name: '回血', icon: '❤', color: '#34D399', stat: 'heal', weight: 10, clearSpeed: 260 },
    { name: '火焰', icon: '🔥', color: '#FEB144', stat: 'attack', weight: 1, clearSpeed: 260 },
    { name: '自然', icon: '☘', color: '#9EE09E', stat: 'heal', weight: 1, clearSpeed: 260 },
    { name: '星光', icon: '★', color: '#FDE68A', stat: 'spell', weight: 1, clearSpeed: 260 }
  ];

  function blockType(value) {
    return BLOCK_TYPES[value % BLOCK_TYPES.length];
  }

  function activeBlockTypes(colorCount) {
    return BLOCK_TYPES.slice(0, colorCount);
  }

  function randomBlockIndex(colorCount) {
    const activeTypes = activeBlockTypes(colorCount);
    const totalWeight = activeTypes.reduce((sum, type) => sum + Math.max(0, Number(type.weight) || 0), 0);
    if (totalWeight <= 0) return Math.floor(Math.random() * colorCount);

    let pick = Math.random() * totalWeight;
    for (let index = 0; index < activeTypes.length; index++) {
      pick -= Math.max(0, Number(activeTypes[index].weight) || 0);
      if (pick < 0) return index;
    }
    return activeTypes.length - 1;
  }

  global.Match3Config = { BLOCK_TYPES, activeBlockTypes, blockType, randomBlockIndex };
})(window);
