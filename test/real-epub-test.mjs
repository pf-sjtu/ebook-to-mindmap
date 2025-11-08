import { EpubProcessor } from '../src/services/epubProcessor'

/**
 * 实际EPUB文件测试脚本
 * 用于验证修复后的EPUB目录深度过滤功能
 */

async function testRealEpubFile() {
  console.log('🧪 开始实际EPUB文件深度过滤测试')
  
  const epubProcessor = new EpubProcessor()
  
  try {
    // 检查测试文件是否存在
    const testFilePath = 'd:/JS/ebook-to-mindmap/tmp/海龟交易法则.epub'
    console.log(`📖 测试文件路径: ${testFilePath}`)
    
    // 在Node.js环境中读取文件
    const fs = await import('fs')
    if (!fs.existsSync(testFilePath)) {
      throw new Error(`测试文件不存在: ${testFilePath}`)
    }
    
    const fileBuffer = fs.readFileSync(testFilePath)
    const file = new File([fileBuffer], '海龟交易法则.epub', { type: 'application/epub+zip' })
    
    console.log('✅ 测试文件读取成功')
    
    // 测试不同的目录深度设置
    const testDepths = [1, 2, 3]
    const results = []
    
    for (const depth of testDepths) {
      console.log(`\n🔍 测试目录深度: ${depth}`)
      console.log('-'.repeat(40))
      
      const result = await epubProcessor.extractBookData(
        file,
        false, // useSmartDetection
        true,  // skipNonEssentialChapters  
        0,     // maxSubChapterDepth
        'auto', // chapterNamingMode
        'epub-toc', // chapterDetectionMode - 使用EPUB目录模式
        depth   // epubTocDepth
      )
      
      console.log(`✅ 深度${depth}找到${result.chapters.length}个章节:`)
      
      // 按深度分组显示章节
      const chaptersByDepth = {}
      result.chapters.forEach((chapter, index) => {
        const depthKey = chapter.depth || 0
        if (!chaptersByDepth[depthKey]) {
          chaptersByDepth[depthKey] = []
        }
        chaptersByDepth[depthKey].push({ index: index + 1, title: chapter.title })
      })
      
      // 显示各深度的章节
      Object.keys(chaptersByDepth).sort().forEach(depthKey => {
        console.log(`  深度${depthKey} (${chaptersByDepth[depthKey].length}个):`)
        chaptersByDepth[depthKey].forEach(ch => {
          console.log(`    ${ch.index}. ${ch.title}`)
        })
      })
      
      // 验证过滤是否正确
      const maxAllowedDepth = depth - 1
      const invalidChapters = result.chapters.filter(ch => (ch.depth || 0) > maxAllowedDepth)
      
      if (invalidChapters.length > 0) {
        console.log(`❌ 发现${invalidChapters.length}个超出深度${depth}的章节:`)
        invalidChapters.forEach(ch => {
          console.log(`    - [深度${ch.depth}] ${ch.title}`)
        })
        results.push({ depth, success: false, error: `包含${invalidChapters.length}个超深度章节` })
      } else {
        console.log(`✅ 所有${result.chapters.length}个章节都在深度${depth}范围内 (深度0-${maxAllowedDepth})`)
        results.push({ depth, success: true, chaptersCount: result.chapters.length })
      }
    }
    
    // 显示测试总结
    console.log('\n' + '='.repeat(50))
    console.log('📊 实际文件测试总结')
    console.log('='.repeat(50))
    
    const allPassed = results.every(r => r.success)
    
    if (allPassed) {
      console.log('✅ 所有测试通过！EPUB目录深度过滤功能在实际文件中工作正常。')
      console.log('\n修复效果验证:')
      results.forEach(r => {
        console.log(`- ${r.depth}级目录: ✅ 正确显示${r.chaptersCount}个章节`)
      })
    } else {
      console.log('❌ 部分测试失败，修复可能不完整。')
      results.forEach(r => {
        if (!r.success) {
          console.log(`  - 深度${r.depth}: ❌ ${r.error}`)
        }
      })
    }
    
    return results
    
  } catch (error) {
    console.error('❌ 实际文件测试失败:', error)
    throw error
  }
}

// 导出测试函数
export { testRealEpubFile }

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  testRealEpubFile()
    .then(() => {
      console.log('\n🎉 测试完成！')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 测试失败:', error)
      process.exit(1)
    })
}
