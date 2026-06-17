(function (global) {
  const BLOCK_TYPES = [
    { name: '攻擊', icon: '⚔', color: '#FF6663', stat: 'attack' },
    { name: '防禦', icon: '🛡', color: '#60A5FA', stat: 'defense' },
    { name: '法術', icon: '✦', color: '#A78BFA', stat: 'spell' },
    { name: '回血', icon: '❤', color: '#34D399', stat: 'heal' },
    { name: '火焰', icon: '🔥', color: '#FEB144', stat: 'attack' },
    { name: '自然', icon: '☘', color: '#9EE09E', stat: 'heal' },
    { name: '星光', icon: '★', color: '#FDE68A', stat: 'spell' }
  ];

  function blockType(value) {
    return BLOCK_TYPES[value % BLOCK_TYPES.length];
  }

  global.Match3Config = { BLOCK_TYPES, blockType };
})(window);
