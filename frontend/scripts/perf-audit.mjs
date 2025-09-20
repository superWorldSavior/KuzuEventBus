#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESULTS_FILE = path.join(__dirname, '../performance-results.json');

// Lighthouse categories to test
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];

// URLs to test (can be local or remote)
const URLS_TO_TEST = [
  'http://localhost:5173/',  // Development server
  'http://localhost:4173/',  // Preview server
];

class PerformanceAuditor {
  constructor() {
    this.results = [];
  }

  async runLighthouse(url, outputPath) {
    return new Promise((resolve, reject) => {
      const args = [
        url,
        '--output=json',
        `--output-path=${outputPath}`,
        '--chrome-flags="--headless --no-sandbox --disable-dev-shm-usage"',
        '--quiet',
        '--only-categories=' + CATEGORIES.join(',')
      ];

      const lighthouse = spawn('npx', ['lighthouse', ...args], {
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      lighthouse.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      lighthouse.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      lighthouse.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Lighthouse failed: ${stderr}`));
        }
      });
    });
  }

  async auditURL(url) {
    console.log(`🔍 Auditing: ${url}`);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(__dirname, `../lighthouse-${timestamp}.json`);
    
    try {
      await this.runLighthouse(url, outputPath);
      
      if (fs.existsSync(outputPath)) {
        const report = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        
        const result = {
          url,
          timestamp,
          scores: this.extractScores(report),
          metrics: this.extractMetrics(report),
          opportunities: this.extractOpportunities(report),
          diagnostics: this.extractDiagnostics(report)
        };

        // Clean up temporary file
        fs.unlinkSync(outputPath);
        
        return result;
      } else {
        throw new Error('Lighthouse report not generated');
      }
    } catch (error) {
      console.error(`❌ Failed to audit ${url}:`, error.message);
      return null;
    }
  }

  extractScores(report) {
    const scores = {};
    CATEGORIES.forEach(category => {
      const categoryData = report.lhr?.categories?.[category];
      if (categoryData) {
        scores[category] = Math.round(categoryData.score * 100);
      }
    });
    return scores;
  }

  extractMetrics(report) {
    const metrics = {};
    const audits = report.lhr?.audits || {};
    
    const metricsMap = {
      'first-contentful-paint': 'FCP',
      'largest-contentful-paint': 'LCP',
      'first-meaningful-paint': 'FMP',
      'speed-index': 'Speed Index',
      'interactive': 'TTI',
      'total-blocking-time': 'TBT',
      'cumulative-layout-shift': 'CLS'
    };

    Object.entries(metricsMap).forEach(([auditId, label]) => {
      const audit = audits[auditId];
      if (audit && audit.numericValue !== undefined) {
        const value = audit.numericValue;
        const unit = audit.numericUnit || 'ms';
        
        metrics[label] = {
          value: Math.round(value),
          unit,
          score: audit.score ? Math.round(audit.score * 100) : null
        };
      }
    });

    return metrics;
  }

  extractOpportunities(report) {
    const audits = report.lhr?.audits || {};
    const opportunities = [];

    Object.values(audits).forEach(audit => {
      if (audit.details?.type === 'opportunity' && audit.numericValue > 0) {
        opportunities.push({
          id: audit.id,
          title: audit.title,
          description: audit.description,
          savings: Math.round(audit.numericValue),
          score: audit.score ? Math.round(audit.score * 100) : null
        });
      }
    });

    return opportunities.sort((a, b) => b.savings - a.savings).slice(0, 10);
  }

  extractDiagnostics(report) {
    const audits = report.lhr?.audits || {};
    const diagnostics = [];

    Object.values(audits).forEach(audit => {
      if (audit.score !== null && audit.score < 1 && audit.details?.type !== 'opportunity') {
        diagnostics.push({
          id: audit.id,
          title: audit.title,
          description: audit.description,
          score: Math.round(audit.score * 100)
        });
      }
    });

    return diagnostics.sort((a, b) => a.score - b.score).slice(0, 10);
  }

  async runFullAudit() {
    console.log('🚀 Starting performance audit...\n');

    for (const url of URLS_TO_TEST) {
      const result = await this.auditURL(url);
      if (result) {
        this.results.push(result);
      }
    }

    return this.results;
  }

  printResults() {
    console.log('\n📊 Performance Audit Results');
    console.log('============================\n');

    this.results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.url}`);
      console.log(`   Timestamp: ${new Date(result.timestamp).toLocaleString()}`);
      
      // Scores
      console.log('   Scores:');
      Object.entries(result.scores).forEach(([category, score]) => {
        const icon = score >= 90 ? '🟢' : score >= 70 ? '🟡' : '🔴';
        console.log(`     ${icon} ${category}: ${score}/100`);
      });

      // Key metrics
      console.log('   Key Metrics:');
      Object.entries(result.metrics).forEach(([metric, data]) => {
        const icon = data.score >= 90 ? '🟢' : data.score >= 70 ? '🟡' : '🔴';
        console.log(`     ${icon} ${metric}: ${data.value}${data.unit}`);
      });

      // Top opportunities
      if (result.opportunities.length > 0) {
        console.log('   Top Opportunities:');
        result.opportunities.slice(0, 3).forEach(opp => {
          console.log(`     • ${opp.title}: ${opp.savings}ms savings`);
        });
      }

      console.log('');
    });

    // Summary
    if (this.results.length > 0) {
      const avgScores = {};
      CATEGORIES.forEach(category => {
        const scores = this.results.map(r => r.scores[category]).filter(Boolean);
        if (scores.length > 0) {
          avgScores[category] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }
      });

      console.log('📈 Average Scores:');
      Object.entries(avgScores).forEach(([category, score]) => {
        const icon = score >= 90 ? '🟢' : score >= 70 ? '🟡' : '🔴';
        console.log(`   ${icon} ${category}: ${score}/100`);
      });
    }
  }

  saveResults() {
    const fullResults = {
      timestamp: new Date().toISOString(),
      results: this.results
    };

    fs.writeFileSync(RESULTS_FILE, JSON.stringify(fullResults, null, 2));
    console.log(`\n💾 Results saved to: ${RESULTS_FILE}`);
  }
}

// Check if Lighthouse is available
function checkLighthouse() {
  return new Promise((resolve) => {
    const check = spawn('npx', ['lighthouse', '--version'], { stdio: 'pipe' });
    check.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

async function main() {
  try {
    // Check if Lighthouse is available
    const hasLighthouse = await checkLighthouse();
    if (!hasLighthouse) {
      console.log('⚠️  Lighthouse not found. Installing...');
      console.log('Run: npm install -g lighthouse');
      console.log('Or use: npx lighthouse --version');
      process.exit(1);
    }

    const auditor = new PerformanceAuditor();
    await auditor.runFullAudit();
    
    auditor.printResults();
    auditor.saveResults();

    // Exit with error if performance is too low
    const avgPerformance = auditor.results.reduce((sum, result) => 
      sum + (result.scores.performance || 0), 0) / auditor.results.length;
    
    if (avgPerformance < 70) {
      console.log('\n❌ Performance score is below threshold (70)');
      process.exit(1);
    } else if (avgPerformance < 90) {
      console.log('\n⚠️  Performance could be improved');
    } else {
      console.log('\n✅ Excellent performance!');
    }

  } catch (error) {
    console.error('❌ Performance audit failed:', error.message);
    process.exit(1);
  }
}

main();