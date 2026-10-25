#!/usr/bin/env node

/**
 * AWS Cost Estimator for Exam AI Platform
 * 
 * This script helps estimate monthly AWS costs based on usage
 */

interface UsageMetrics {
  // EC2
  instanceType: 't3.micro' | 't3.small' | 't3.medium' | 't3.large';
  instanceHours: number; // hours per month
  
  // S3
  storageGB: number;
  getRequests: number; // per month
  putRequests: number; // per month
  dataTransferGB: number; // GB out to internet
  
  // Data
  totalTestPapers: number;
  avgTestSizeKB: number;
  generatedAnswersCount: number;
  avgAnswerSizeKB: number;
  
  // Traffic
  monthlyActiveUsers: number;
  avgTestsPerUser: number;
}

class CostEstimator {
  // Pricing (US East - Virginia, as of 2024)
  private readonly PRICING = {
    ec2: {
      't3.micro': 0.0104,   // per hour
      't3.small': 0.0208,   // per hour
      't3.medium': 0.0416,  // per hour
      't3.large': 0.0832,   // per hour
    },
    ebs: {
      gp3: 0.08,  // per GB-month
    },
    s3: {
      storage: 0.023,      // per GB-month (first 50TB)
      putRequest: 0.005,   // per 1,000 requests
      getRequest: 0.0004,  // per 1,000 requests
      dataTransfer: 0.09,  // per GB (after first 100GB free)
    },
    dataTransfer: {
      free: 100,  // GB per month
    },
  };

  estimateCost(metrics: UsageMetrics): void {
    console.log('\n' + '='.repeat(60));
    console.log('💰 AWS COST ESTIMATION - EXAM AI PLATFORM');
    console.log('='.repeat(60));
    
    // EC2 Costs
    const ec2Cost = this.calculateEC2Cost(metrics);
    
    // EBS Storage
    const ebsCost = this.calculateEBSCost(30); // 30GB
    
    // S3 Storage
    const s3Cost = this.calculateS3Cost(metrics);
    
    // Data Transfer
    const transferCost = this.calculateDataTransferCost(metrics);
    
    // Total
    const totalMonthly = ec2Cost + ebsCost + s3Cost + transferCost;
    const totalYearly = totalMonthly * 12;
    
    // Display breakdown
    console.log('\n📊 COST BREAKDOWN (Monthly):\n');
    console.log(`EC2 Instance (${metrics.instanceType}):`);
    console.log(`  ${metrics.instanceHours} hours × $${this.PRICING.ec2[metrics.instanceType]}/hr`);
    console.log(`  = $${ec2Cost.toFixed(2)}/month`);
    
    console.log(`\nEBS Storage (30GB gp3):`);
    console.log(`  = $${ebsCost.toFixed(2)}/month`);
    
    console.log(`\nS3 Storage (${metrics.storageGB.toFixed(2)}GB):`);
    console.log(`  Storage: $${(metrics.storageGB * this.PRICING.s3.storage).toFixed(2)}`);
    console.log(`  GET requests: $${((metrics.getRequests / 1000) * this.PRICING.s3.getRequest).toFixed(2)}`);
    console.log(`  PUT requests: $${((metrics.putRequests / 1000) * this.PRICING.s3.putRequest).toFixed(2)}`);
    console.log(`  = $${s3Cost.toFixed(2)}/month`);
    
    console.log(`\nData Transfer (${metrics.dataTransferGB.toFixed(2)}GB):`);
    console.log(`  = $${transferCost.toFixed(2)}/month`);
    
    console.log('\n' + '-'.repeat(60));
    console.log(`💵 TOTAL MONTHLY COST: $${totalMonthly.toFixed(2)}`);
    console.log(`💵 TOTAL YEARLY COST:  $${totalYearly.toFixed(2)}`);
    console.log('='.repeat(60));
    
    // Optimization suggestions
    this.printOptimizationTips(metrics, totalMonthly);
  }

  private calculateEC2Cost(metrics: UsageMetrics): number {
    return metrics.instanceHours * this.PRICING.ec2[metrics.instanceType];
  }

  private calculateEBSCost(sizeGB: number): number {
    return sizeGB * this.PRICING.ebs.gp3;
  }

  private calculateS3Cost(metrics: UsageMetrics): number {
    const storageCost = metrics.storageGB * this.PRICING.s3.storage;
    const getCost = (metrics.getRequests / 1000) * this.PRICING.s3.getRequest;
    const putCost = (metrics.putRequests / 1000) * this.PRICING.s3.putRequest;
    
    return storageCost + getCost + putCost;
  }

  private calculateDataTransferCost(metrics: UsageMetrics): number {
    const billableGB = Math.max(0, metrics.dataTransferGB - this.PRICING.dataTransfer.free);
    return billableGB * this.PRICING.s3.dataTransfer;
  }

  private printOptimizationTips(metrics: UsageMetrics, monthlyCost: number): void {
    console.log('\n💡 COST OPTIMIZATION TIPS:\n');
    
    if (metrics.instanceHours === 730) {
      const reservedSavings = monthlyCost * 0.3;
      console.log(`✅ Consider Reserved Instance: Save ~$${reservedSavings.toFixed(2)}/month (30%)`);
    }
    
    if (metrics.storageGB > 100) {
      console.log('✅ Enable S3 Intelligent-Tiering for automatic cost optimization');
      console.log('✅ Use S3 Lifecycle policies to archive old data to Glacier');
    }
    
    if (metrics.dataTransferGB > 200) {
      console.log('✅ Use CloudFront CDN to reduce S3 data transfer costs');
    }
    
    if (metrics.instanceType === 't3.medium' || metrics.instanceType === 't3.large') {
      console.log('✅ Consider auto-scaling to use smaller instances during low traffic');
    }
    
    console.log('✅ Use S3 compression for all test papers and answers (80-90% savings)');
    console.log('✅ Set up AWS Budget alerts to monitor spending');
    console.log('');
  }
}

// Example usage scenarios
function runEstimates(): void {
  const estimator = new CostEstimator();

  // Scenario 1: Small deployment (just starting)
  console.log('\n\n🌱 SCENARIO 1: SMALL DEPLOYMENT (Starting)');
  estimator.estimateCost({
    instanceType: 't3.small',
    instanceHours: 730, // Full month
    storageGB: 50,      // 50GB of compressed tests + answers
    getRequests: 50000,
    putRequests: 5000,
    dataTransferGB: 80,
    totalTestPapers: 1186,
    avgTestSizeKB: 30,
    generatedAnswersCount: 500,
    avgAnswerSizeKB: 50,
    monthlyActiveUsers: 100,
    avgTestsPerUser: 3,
  });

  // Scenario 2: Medium deployment (growing)
  console.log('\n\n🚀 SCENARIO 2: MEDIUM DEPLOYMENT (Growing)');
  estimator.estimateCost({
    instanceType: 't3.medium',
    instanceHours: 730,
    storageGB: 200,
    getRequests: 500000,
    putRequests: 50000,
    dataTransferGB: 300,
    totalTestPapers: 1186,
    avgTestSizeKB: 30,
    generatedAnswersCount: 5000,
    avgAnswerSizeKB: 50,
    monthlyActiveUsers: 1000,
    avgTestsPerUser: 5,
  });

  // Scenario 3: Large deployment (established)
  console.log('\n\n⭐ SCENARIO 3: LARGE DEPLOYMENT (Established)');
  estimator.estimateCost({
    instanceType: 't3.large',
    instanceHours: 730,
    storageGB: 500,
    getRequests: 2000000,
    putRequests: 200000,
    dataTransferGB: 1000,
    totalTestPapers: 1186,
    avgTestSizeKB: 30,
    generatedAnswersCount: 20000,
    avgAnswerSizeKB: 50,
    monthlyActiveUsers: 10000,
    avgTestsPerUser: 8,
  });

  // Custom estimation (your actual usage)
  console.log('\n\n📝 CUSTOM SCENARIO (Your Usage)');
  estimator.estimateCost({
    instanceType: 't3.small',
    instanceHours: 730,
    storageGB: calculateTotalStorage(1186, 30, 10000, 50),
    getRequests: calculateGetRequests(500, 5),
    putRequests: calculatePutRequests(500, 2),
    dataTransferGB: calculateDataTransfer(500, 5, 30),
    totalTestPapers: 1186,
    avgTestSizeKB: 30,
    generatedAnswersCount: 10000,
    avgAnswerSizeKB: 50,
    monthlyActiveUsers: 500,
    avgTestsPerUser: 5,
  });
}

function calculateTotalStorage(
  testPapers: number,
  avgTestSizeKB: number,
  answers: number,
  avgAnswerSizeKB: number
): number {
  return ((testPapers * avgTestSizeKB) + (answers * avgAnswerSizeKB)) / 1024 / 1024;
}

function calculateGetRequests(users: number, testsPerUser: number): number {
  // Each test: 1 GET for test paper + 1 GET for answers + multiple for assets
  return users * testsPerUser * 10;
}

function calculatePutRequests(users: number, actionsPerUser: number): number {
  // Submissions, reports, uploads
  return users * actionsPerUser;
}

function calculateDataTransfer(users: number, testsPerUser: number, avgTestSizeKB: number): number {
  // Data sent to users
  return (users * testsPerUser * avgTestSizeKB * 2) / 1024 / 1024;
}

// Run all scenarios
runEstimates();

console.log('\n' + '='.repeat(60));
console.log('ℹ️  NOTE: These are estimates based on AWS pricing as of 2024.');
console.log('   Actual costs may vary. Use AWS Cost Calculator for precise estimates.');
console.log('   Link: https://calculator.aws/');
console.log('='.repeat(60) + '\n');
