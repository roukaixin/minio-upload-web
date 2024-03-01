<template>
  <el-card style="width: 80%; margin: 80px auto; text-align: left" header="文件分片上传">
    <el-upload
        class="upload-demo"
        drag
        action="/"
        multiple
        :http-request="httpRequest"
    >
      <el-icon class="el-icon--upload"><upload-filled /></el-icon>
      <div class="el-upload__text">
        请拖拽文件到此处或 <em>点击此处上传</em>
      </div>
    </el-upload>
  </el-card>
</template>

<script setup>
import { UploadFilled } from '@element-plus/icons-vue'
import SparkMd5 from 'spark-md5'
import axios from "axios";

/**
 * 饿了吗自定义上传
 * @param options
 * @returns {Promise<void>}
 */
const httpRequest = async (options) =>{
  // 获取上传的文件
  const file = options.file
  // 对文件进行分片（分片是不需要计算数据，所以分片会很快）
  const chunkSize = 5 * 1024 * 1024;
  const totalSize = file.size;
  const chunks = createChunks(file,chunkSize);
  // await 等待返回
  const md5 = await hashMD5(chunks)
  const data = {
    fileIdentifier: md5,
    fileName: file.name,
    fileType: file.type,
    totalSize: totalSize,
    chunkSize: chunkSize
  }
  // 创建分片 uploadId
  const multipartUploadId = await createMultipartUploadId(data);
  console.info("分片的长度：",chunks.length)
  const uploadPartAsyncs = [];
  for (let i = 0; i < chunks.length; i++){
    const data = {
      fileIdentifier: md5,
      uploadId: multipartUploadId,
      file: chunks[i],
      partNumber: i + 1
    }
    uploadPartAsyncs.push(uploadPartAsync(data));
  }
  // 上传并合并
  Promise.all(uploadPartAsyncs).then(()=>{
    completeMultipartUploadAsync(md5)
    console.info("合并成功")
  })
}

/**
 * 获取 uploadId
 * @param data 文件基本信息（MD5，文件名，文件类型，文件总大小，分片大小）
 * @returns {Promise<void>}
 */
const createMultipartUploadId = async (data)=>{
  return new Promise(resolve => {
    axios.post("/v1/minio/create-multipart-upload-id",data).then((response) => {
      resolve(response.data.data.uploadId);
    })
  })
}

/**
 * 上传分片
 * @param data
 * @returns {Promise<void>}
 */
const uploadPartAsync = (data)=>{
  return new Promise(resolve =>{
    // 上传分片
    axios.put("/v1/minio/upload-part-async", data, {headers: {'Content-Type': 'multipart/form-data'}}).then((response) => {
      resolve(response.data.data)
    });
  })
}

/**
 * 合并分片
 * @param md5 文件 md5
 * @returns {Promise<unknown>}
 */
const completeMultipartUploadAsync = (md5) => {
  return new Promise(resolve => {
    axios.post("/v1/minio/complete-multipart-upload-async",{fileIdentifier: md5}).then((response)=>{
      resolve(response.data.data);
    })
  })
}

/**
 * 进行分片
 * @param file 文件
 * @param chunkSize 分片块的大小（不传默认 5MB）
 * @returns {*[]} blob数组对象
 */
const createChunks = (file,chunkSize = 5 * 1024 * 1024) => {
  const result = [];
  for (let i = 0; i < file.size; i += chunkSize) {
    // blob 和 file 对象都是可以直接发生到服务器
    // 把分片信息添加到数组里
    result.push(file.slice(i,i + chunkSize));
  }
  return result;
}

/**
 * 计算文件 hashMD5 值
 * @param chunks 分片
 * @returns {Promise<unknown>}
 */
const  hashMD5 = async (chunks) => {
  return new Promise(resolve => {
    // 开始计算时间
    const startTime = new Date().getTime();
    // md5 缓冲对象
    let spark = new SparkMd5.ArrayBuffer();
    // 方法
    function _read(chunkNum){
      if (chunkNum >= chunks.length){
        // 计算完成
        resolve(spark.end()); // 获取文件 md5 值
        // 结束计算时间
        const endTime = new Date().getTime();
        console.log("计算耗时：" ,(endTime - startTime) / 1000, 's');
        return;
      }
      // 获取分片的文件字节信息
      const blob = chunks[chunkNum];
      // 读文件
      const reader = new FileReader();
      // 对文件的异步事件
      reader.onload = e => {
        // 读取每个分片的字节数组
        let result = e.target.result;
        // 追加文件 md5 值
        spark.append(result)
        // 递归调用当前方法
        _read(chunkNum+1)
      }
      // 读文件过程是异步的，所以有个 onload 事件
      reader.readAsArrayBuffer(blob)
    }
    // 执行方法 ，从 0 开始
    _read(0)
  })
}

</script>

<style scoped>

</style>
