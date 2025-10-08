import Popover from '@/components/common/Popover'
import Image from 'next/image'
import { useState } from 'react'

export default function ModelList() {
  const modelList = [
    {
      name: 'Auto',
      description: 'Decides how long to think',
    },
    {
      name: 'Instant',
      description: 'Answers right away',
      type: 'Instant',
    },
    {
      name: 'Thinking',
      description: 'Thinks longer for better answers',
      type: 'Thinking',
    },
  ]

  const [currentModel, setCurrentModel] = useState(modelList[0])

  const modelListJSX = (
    <div className="flex flex-col w-[250px]">
      <span className="text-gray-400 text-sm mb-0.5">GPT-5</span>
      {modelList.map((model) => (
        <div
          key={model.name}
          className="flex items-center justify-between -mx-1.5 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
          onClick={() => setCurrentModel(model)}
        >
          <div>
            <div>{model.name}</div>
            <div className="text-sm text-gray-400">{model.description}</div>
          </div>
          {currentModel.name === model.name && <span>✅</span>}
        </div>
      ))}
    </div>
  )

  return (
    <Popover
      content={modelListJSX}
      placement="bottom-start"
      className="sidebar-item flex items-center p-1"
    >
      <span>ChatGPT</span>
      <span className="text-gray-400 px-1">5</span>
      {currentModel.type ? (
        <span className="text-gray-400">{currentModel.type}</span>
      ) : null}
      <Image
        src="/common/down-arrow.svg"
        alt="down-arrow"
        width={16}
        height={16}
      />
    </Popover>
  )
}

