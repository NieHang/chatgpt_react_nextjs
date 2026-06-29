'use client'

import Popover from '@/components/common/Popover'
import clsx from 'clsx'
import Image from 'next/image'
import { useState } from 'react'
import Tip from '@/components/common/Tip'
import { useModel } from '@/stores/modelStore'

interface Model {
  name: string
  model: string
  alias: string
  intelligenceTypes: {
    name: string
    type?: string
  }[]
}

export default function ModelList() {
  const models: Model[] = [
    {
      name: 'GPT-5.5',
      model: 'gpt-5.5',
      alias: '5.5',
      intelligenceTypes: [
        {
          name: 'Instant',
        },
        {
          name: 'Medium',
          type: 'Medium',
        },
        {
          name: 'Thinking',
          type: 'Thinking',
        },
      ],
    },
    {
      name: 'GPT-5.4',
      model: 'gpt-5.4',
      alias: '5.4',
      intelligenceTypes: [
        {
          name: 'Instant',
        },
        {
          name: 'Medium',
          type: 'Medium',
        },
        {
          name: 'Thinking',
          type: 'Thinking',
        },
      ],
    },
    {
      name: 'GPT-5.3',
      model: 'gpt-5.3',
      alias: '5.3',
      intelligenceTypes: [
        {
          name: 'Instant',
        },
      ],
    },
    {
      name: 'GPT-4o-Mini',
      model: 'gpt-4o-mini',
      alias: '4o-mini',
      intelligenceTypes: [
        {
          name: 'Instant',
        },
      ],
    },
  ]

  const [currentModel, setCurrentModel] = useState(models[0])
  const [currentIntelligenceType, setCurrentIntelligenceType] = useState(
    models[0].intelligenceTypes[0],
  )

  const updateModel = useModel((state) => state.updateModel)

  const intelligenceTypeListJSX = (
    <div className="flex flex-col w-[200px]">
      <span className="text-gray-400 text-xm mb-0.5">Intelligence</span>
      {currentModel.intelligenceTypes.map((intelligenceType) => (
        <div
          key={intelligenceType.name}
          className={clsx(
            'flex items-center justify-between gap-2',
            '-mx-1.5 p-2 rounded-md',
            'hover:bg-gray-50 cursor-pointer',
          )}
          onClick={() => setCurrentIntelligenceType(intelligenceType)}
        >
          <div>
            <div>{intelligenceType.name}</div>
          </div>
          {currentIntelligenceType.name === intelligenceType.name && (
            <Image
              src="/common/tick.svg"
              alt="selected intelligence type"
              width={15}
              height={15}
            />
          )}
        </div>
      ))}
      <Popover
        content={models.map((model, index) => (
          <div
            key={index}
            className={clsx(
              'flex items-center justify-between gap-2',
              'w-[150px] -mx-1.5 p-2 rounded-md',
              'hover:bg-gray-50 cursor-pointer',
            )}
            onClick={() => handleSetCurrentModel(model)}
          >
            {model.name}
            {currentModel.name === model.name && (
              <Image
                src="/common/tick.svg"
                alt="selected intelligence type"
                width={15}
                height={15}
              />
            )}
          </div>
        ))}
        placement="right-start"
        floatingClassName="border-gray-300 border-1 rounded-2xl py-2 px-3 z-10 bg-white"
      >
        <div
          className={clsx(
            'flex items-center justify-between gap-2',
            '-mx-1.5 p-2 rounded-md',
            'hover:bg-gray-50 cursor-pointer',
          )}
        >
          <div>{currentModel.name}</div>
          <Image
            src="/common/right-arrow.svg"
            alt="select model"
            width={15}
            height={15}
          />
        </div>
      </Popover>
    </div>
  )

  function handleSetCurrentModel(model: Model) {
    setCurrentModel(model)
    const intelligenceType = !model.intelligenceTypes.find(
      (item) => item.name === currentIntelligenceType.name,
    )
      ? model.intelligenceTypes[0]
      : currentIntelligenceType
    setCurrentIntelligenceType(intelligenceType)

    updateModel({
      model: model.model,
      intelligence: intelligenceType.name,
    })
  }

  return (
    <Tip
      tipContent={
        <div className="flex items-center gap-2">
          <span className="text-bold">Select model</span>
          <span className="text-gray-400">Ctrl + Shift + M</span>
        </div>
      }
    >
      <Popover
        content={intelligenceTypeListJSX}
        placement="bottom"
        floatingClassName="border-gray-300 border-1 rounded-2xl py-2 px-3 z-10 bg-white"
      >
        <div
          className={clsx(
            'flex items-center justify-center gap-1',
            'py-2 px-5 rounded-3xl',
            'hover:bg-gray-100',
            'cursor-pointer',
          )}
        >
          <div className="whitespace-nowrap">{currentModel.alias}</div>
          <span className="text-gray-400 text-xm">
            {currentIntelligenceType.name}
          </span>
          <Image
            src="/common/down-arrow.svg"
            alt="down-arrow"
            width={16}
            height={16}
          />
        </div>
      </Popover>
    </Tip>
  )
}
